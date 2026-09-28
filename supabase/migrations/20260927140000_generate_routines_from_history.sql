-- Gera fichas a partir do histórico de treinos: qualquer nome de treino que
-- se repete (nativo ou importado do Hevy, não faz diferença — o exercise_id
-- já resolvido em workout_exercises é a única fonte de dados usada aqui) vira
-- uma ficha, usando a sessão mais recente com aquele nome como molde.
-- Reaproveita save_routine (20260919210000_student_routines.sql) para toda a
-- validação/upsert de routine_exercises/routine_sets — não duplica essa lógica.

create table public.generated_routine_sources (
  student_id uuid not null references public.profiles (id),
  source_name text not null,
  routine_id uuid not null references public.routines (id),
  updated_at timestamptz not null default now(),
  primary key (student_id, source_name)
);

alter table public.generated_routine_sources enable row level security;

create policy generated_routine_sources_select_own
on public.generated_routine_sources for select
to authenticated
using (student_id = (select auth.uid()));

grant select on public.generated_routine_sources to authenticated;

create or replace function public.generate_routines_from_history()
returns table (routine_id uuid, source_name text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  pattern record;
  latest_workout_id uuid;
  existing_routine_id uuid;
  payload jsonb;
  saved_id uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;

  for pattern in
    select btrim(w.name) as name
    from public.workouts w
    where w.student_id = actor
      and w.finished_at is not null
      and w.discarded_at is null
      and btrim(w.name) <> ''
    group by btrim(w.name)
    having count(*) >= 2
  loop
    select w.id into latest_workout_id
    from public.workouts w
    where w.student_id = actor
      and btrim(w.name) = pattern.name
      and w.finished_at is not null
      and w.discarded_at is null
      and exists (select 1 from public.workout_exercises we where we.workout_id = w.id)
    order by w.finished_at desc
    limit 1;

    -- Todas as sessões com esse nome estão vazias (ex.: "Treino livre" sem
    -- série registrada) — não há o que virar ficha.
    if latest_workout_id is null then continue; end if;

    select gs.routine_id into existing_routine_id
    from public.generated_routine_sources gs
    where gs.student_id = actor and gs.source_name = pattern.name;

    select jsonb_build_object(
      'id', existing_routine_id,
      'name', pattern.name,
      'student_id', actor,
      'exercises', jsonb_agg(
        jsonb_build_object('exercise_id', ex.exercise_id, 'sets', ex.sets)
        order by ex.position
      )
    )
    into payload
    from (
      select
        we.position,
        we.exercise_id,
        coalesce(
          jsonb_agg(
            jsonb_build_object('weight_kg', s.weight_kg, 'reps', s.reps)
            order by s.position
          ) filter (where s.id is not null),
          '[]'::jsonb
        ) as sets
      from public.workout_exercises we
      left join public.workout_sets s
        on s.workout_exercise_id = we.id and s.set_type <> 'warmup'
      where we.workout_id = latest_workout_id
      group by we.position, we.exercise_id
    ) ex;

    begin
      saved_id := public.save_routine(payload);

      insert into public.generated_routine_sources (student_id, source_name, routine_id)
      values (actor, pattern.name, saved_id)
      on conflict on constraint generated_routine_sources_pkey
      do update set routine_id = excluded.routine_id, updated_at = now();

      routine_id := saved_id;
      source_name := pattern.name;
      status := case when existing_routine_id is null then 'created' else 'updated' end;
      return next;
    exception when others then
      -- Ficha arquivada pela aluna, ou o personal assumiu a edição (mudou o
      -- created_by) — respeita a decisão já tomada, não desarquiva nem
      -- recria por cima. Qualquer outro erro inesperado propaga normalmente.
      if sqlerrm = 'ROUTINE_NOT_FOUND' then
        routine_id := existing_routine_id;
        source_name := pattern.name;
        status := 'skipped';
        return next;
      else
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.generate_routines_from_history() from public;
grant execute on function public.generate_routines_from_history() to authenticated;
