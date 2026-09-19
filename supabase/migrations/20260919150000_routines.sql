-- T2: fichas (rotinas) montadas pelo personal e atribuídas a um aluno.
-- Modelo no estilo Hevy: exercícios em ordem, cada um com notas, descanso e
-- séries-alvo individuais (carga × repetições).

alter type public.notification_kind add value if not exists 'routine_assigned';

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid references public.profiles (id),
  name text not null check (char_length(trim(name)) between 2 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_trainer_idx on public.routines (trainer_id, archived_at);
create index routines_student_idx on public.routines (student_id) where archived_at is null;

create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null check (position >= 0),
  notes text check (notes is null or char_length(notes) <= 300),
  rest_seconds smallint check (rest_seconds is null or rest_seconds between 0 and 600),
  unique (routine_id, position)
);

create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  position smallint not null check (position >= 0),
  target_weight_kg numeric(6, 2) check (target_weight_kg is null or target_weight_kg between 0 and 999),
  target_reps smallint check (target_reps is null or target_reps between 1 and 200),
  unique (routine_exercise_id, position)
);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_sets enable row level security;

-- Personal vê e gerencia as próprias fichas; aluno lê as atribuídas a ele.
create policy routines_select
on public.routines for select
to authenticated
using (trainer_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy routine_exercises_select
on public.routine_exercises for select
to authenticated
using (exists (
  select 1 from public.routines routine
  where routine.id = routine_exercises.routine_id
    and (routine.trainer_id = (select auth.uid()) or routine.student_id = (select auth.uid()))
));

create policy routine_sets_select
on public.routine_sets for select
to authenticated
using (exists (
  select 1 from public.routine_exercises routine_exercise
  join public.routines routine on routine.id = routine_exercise.routine_id
  where routine_exercise.id = routine_sets.routine_exercise_id
    and (routine.trainer_id = (select auth.uid()) or routine.student_id = (select auth.uid()))
));

grant select on public.routines, public.routine_exercises, public.routine_sets to authenticated;

-- Escrita só pelo RPC abaixo, que valida vínculo e grava tudo em uma transação.
create or replace function public.save_routine(routine jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_routine_id uuid := nullif(routine ->> 'id', '')::uuid;
  target_student uuid := nullif(routine ->> 'student_id', '')::uuid;
  routine_name text := btrim(routine ->> 'name');
  routine_notes text := nullif(btrim(coalesce(routine ->> 'notes', '')), '');
  exercise jsonb;
  set_item jsonb;
  exercise_position integer := 0;
  set_position integer;
  routine_exercise_id uuid;
  previous_student uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'trainer') then
    raise exception 'TRAINER_REQUIRED';
  end if;
  if routine_name is null or char_length(routine_name) < 2 then raise exception 'INVALID_ROUTINE_NAME'; end if;
  if jsonb_typeof(routine -> 'exercises') <> 'array' or jsonb_array_length(routine -> 'exercises') = 0 then
    raise exception 'ROUTINE_NEEDS_EXERCISES';
  end if;
  if target_student is not null and not public.is_active_trainer_of(target_student) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  if current_routine_id is null then
    insert into public.routines (trainer_id, student_id, name, notes)
    values (auth.uid(), target_student, routine_name, routine_notes)
    returning id into current_routine_id;
  else
    select student_id into previous_student from public.routines
    where id = current_routine_id and trainer_id = auth.uid() for update;
    if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
    update public.routines
    set student_id = target_student, name = routine_name, notes = routine_notes
    where id = current_routine_id;
    delete from public.routine_exercises where routine_id = current_routine_id;
  end if;

  for exercise in select * from jsonb_array_elements(routine -> 'exercises') loop
    if not exists (select 1 from public.exercises where id = (exercise ->> 'exercise_id')::uuid) then
      raise exception 'EXERCISE_NOT_FOUND';
    end if;
    insert into public.routine_exercises (routine_id, exercise_id, position, notes, rest_seconds)
    values (
      current_routine_id, (exercise ->> 'exercise_id')::uuid, exercise_position,
      nullif(btrim(coalesce(exercise ->> 'notes', '')), ''),
      nullif(exercise ->> 'rest_seconds', '')::smallint
    ) returning id into routine_exercise_id;

    set_position := 0;
    for set_item in select * from jsonb_array_elements(coalesce(exercise -> 'sets', '[]'::jsonb)) loop
      insert into public.routine_sets (routine_exercise_id, position, target_weight_kg, target_reps)
      values (
        routine_exercise_id, set_position,
        nullif(set_item ->> 'weight_kg', '')::numeric,
        nullif(set_item ->> 'reps', '')::smallint
      );
      set_position := set_position + 1;
    end loop;
    exercise_position := exercise_position + 1;
  end loop;

  -- Aviso ao aluno quando a ficha é atribuída ou trocada de aluno.
  if target_student is not null and (previous_student is null or previous_student <> target_student) then
    perform public.notify_user(target_student, 'routine_assigned',
      'Nova ficha: ' || routine_name,
      'Seu personal montou uma ficha para você.',
      '/app/treinos');
  end if;

  return current_routine_id;
end;
$$;

revoke all on function public.save_routine(jsonb) from public;
grant execute on function public.save_routine(jsonb) to authenticated;

create or replace function public.archive_routine(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.routines set archived_at = now()
  where id = target_routine_id and trainer_id = auth.uid() and archived_at is null;
  if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.archive_routine(uuid) from public;
grant execute on function public.archive_routine(uuid) to authenticated;

-- Copia uma ficha (para outro aluno ou como modelo), preservando exercícios e séries.
create or replace function public.duplicate_routine(target_routine_id uuid, target_student_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.routines;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into source from public.routines where id = target_routine_id and trainer_id = auth.uid();
  if source.id is null then raise exception 'ROUTINE_NOT_FOUND'; end if;
  if target_student_id is not null and not public.is_active_trainer_of(target_student_id) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  insert into public.routines (trainer_id, student_id, name, notes)
  values (auth.uid(), target_student_id, source.name || ' (cópia)', source.notes)
  returning id into new_id;

  insert into public.routine_exercises (id, routine_id, exercise_id, position, notes, rest_seconds)
  select gen_random_uuid(), new_id, exercise_id, position, notes, rest_seconds
  from public.routine_exercises where routine_id = source.id;

  insert into public.routine_sets (routine_exercise_id, position, target_weight_kg, target_reps)
  select copy.id, sets.position, sets.target_weight_kg, sets.target_reps
  from public.routine_exercises original
  join public.routine_exercises copy
    on copy.routine_id = new_id and copy.position = original.position
  join public.routine_sets sets on sets.routine_exercise_id = original.id
  where original.routine_id = source.id;

  if target_student_id is not null then
    perform public.notify_user(target_student_id, 'routine_assigned',
      'Nova ficha: ' || source.name, 'Seu personal montou uma ficha para você.', '/app/treinos');
  end if;
  return new_id;
end;
$$;

revoke all on function public.duplicate_routine(uuid, uuid) from public;
grant execute on function public.duplicate_routine(uuid, uuid) to authenticated;
