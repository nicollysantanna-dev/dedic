-- Importação de um treino do Hevy: idempotente por hevy_workout_id, casa
-- exercícios via match_or_create_hevy_exercise e grava recordes via
-- apply_workout_records — mesma paridade de um treino nativo. Insere direto em
-- workouts/workout_exercises/workout_sets (não usa start_workout/finish_workout,
-- que sempre usam now() e não servem para histórico retroativo).
--
-- Contrato esperado em `payload` (normalizado pela função serverless a partir
-- da resposta bruta do Hevy, não o formato exato da API do Hevy):
-- {
--   "name": text, "started_at": timestamptz iso, "finished_at": timestamptz iso,
--   "exercises": [
--     { "template_id": text, "title": text,
--       "sets": [ { "type": "normal"|"warmup"|"failure"|outro, "weight_kg": numeric, "reps": integer } ]
--     }
--   ]
-- }

create table public.hevy_workout_imports (
  hevy_workout_id text primary key,
  workout_id uuid not null references public.workouts (id),
  student_id uuid not null references public.profiles (id),
  imported_at timestamptz not null default now()
);

alter table public.hevy_workout_imports enable row level security;

create policy hevy_workout_imports_select_own
on public.hevy_workout_imports for select
to authenticated
using (student_id = (select auth.uid()) or public.is_active_trainer_of(student_id));

grant select on public.hevy_workout_imports to authenticated, service_role;

create or replace function public.import_hevy_workout(
  target_student_id uuid,
  target_hevy_workout_id text,
  payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_workout_id uuid;
  resolved_trainer_id uuid;
  new_workout_id uuid;
  workout_started_at timestamptz;
  workout_finished_at timestamptz;
  exercise_elem jsonb;
  exercise_position integer := 0;
  new_exercise_id uuid;
  matched_exercise_id uuid;
  set_elem jsonb;
  set_position integer;
begin
  select workout_id into existing_workout_id
  from public.hevy_workout_imports
  where hevy_workout_id = target_hevy_workout_id;
  if existing_workout_id is not null then return existing_workout_id; end if;

  select relationship.trainer_id into resolved_trainer_id
  from public.trainer_student_relationships relationship
  where relationship.student_id = target_student_id and relationship.status = 'active';

  workout_started_at := (payload->>'started_at')::timestamptz;
  workout_finished_at := (payload->>'finished_at')::timestamptz;
  if workout_started_at is null or workout_finished_at is null then
    raise exception 'INVALID_WORKOUT_PAYLOAD';
  end if;
  if workout_finished_at < workout_started_at then
    workout_started_at := workout_finished_at;
  end if;

  -- Nunca colide com uma sessão em andamento: workouts_one_open_per_student só
  -- restringe linhas com finished_at nulo, e este insert sempre grava finished_at.
  insert into public.workouts (
    student_id, trainer_id, name, started_at, finished_at, duration_seconds, recorded_by
  ) values (
    target_student_id, resolved_trainer_id,
    coalesce(nullif(btrim(payload->>'name'), ''), 'Treino importado'),
    workout_started_at, workout_finished_at,
    least(86400, extract(epoch from (workout_finished_at - workout_started_at))::integer),
    target_student_id
  )
  returning id into new_workout_id;

  for exercise_elem in select value from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb))
  loop
    matched_exercise_id := public.match_or_create_hevy_exercise(
      exercise_elem->>'template_id', exercise_elem->>'title', target_student_id
    );

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (new_workout_id, matched_exercise_id, exercise_position)
    returning id into new_exercise_id;

    set_position := 0;
    for set_elem in select value from jsonb_array_elements(coalesce(exercise_elem->'sets', '[]'::jsonb))
    loop
      insert into public.workout_sets (
        workout_exercise_id, position, set_type, weight_kg, reps, completed_at
      ) values (
        new_exercise_id, set_position,
        case
          when set_elem->>'type' in ('normal', 'warmup', 'failure')
            then (set_elem->>'type')::public.workout_set_type
          else 'normal'::public.workout_set_type
        end,
        (set_elem->>'weight_kg')::numeric,
        (set_elem->>'reps')::smallint,
        workout_finished_at
      );
      set_position := set_position + 1;
    end loop;

    exercise_position := exercise_position + 1;
  end loop;

  -- Correto desde que os treinos sejam importados em ordem cronológica
  -- crescente (responsabilidade do orquestrador da sincronização).
  perform public.apply_workout_records(new_workout_id);

  insert into public.hevy_workout_imports (hevy_workout_id, workout_id, student_id)
  values (target_hevy_workout_id, new_workout_id, target_student_id);

  return new_workout_id;
end;
$$;

revoke all on function public.import_hevy_workout(uuid, text, jsonb) from public;
grant execute on function public.import_hevy_workout(uuid, text, jsonb) to service_role;
