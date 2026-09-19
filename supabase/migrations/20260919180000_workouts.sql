-- T3: registro de treino (sessão) no estilo Hevy. Aluno e personal registram;
-- séries são editáveis enquanto a sessão está aberta e imutáveis após finalizar.

alter type public.notification_kind add value if not exists 'workout_finished';

create type public.workout_set_type as enum ('normal', 'warmup', 'failure');

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  trainer_id uuid references public.profiles (id),
  routine_id uuid references public.routines (id),
  appointment_id uuid references public.appointments (id),
  name text not null check (char_length(trim(name)) between 1 and 80),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  notes text check (notes is null or char_length(notes) <= 500),
  recorded_by uuid not null references public.profiles (id),
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workout_finish_after_start check (finished_at is null or finished_at >= started_at)
);

-- Uma sessão aberta por aluno.
create unique index workouts_one_open_per_student
  on public.workouts (student_id) where finished_at is null and discarded_at is null;
create index workouts_student_finished_idx
  on public.workouts (student_id, finished_at desc) where discarded_at is null;
create index workouts_appointment_idx on public.workouts (appointment_id) where appointment_id is not null;

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null check (position >= 0),
  notes text check (notes is null or char_length(notes) <= 300),
  rest_seconds smallint check (rest_seconds is null or rest_seconds between 0 and 600)
);

create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  position smallint not null check (position >= 0),
  set_type public.workout_set_type not null default 'normal',
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 999),
  reps smallint check (reps is null or reps between 0 and 200),
  previous_weight_kg numeric(6, 2),
  previous_reps smallint,
  completed_at timestamptz
);

create index workout_sets_exercise_idx on public.workout_sets (workout_exercise_id, position);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

-- Quem pode ver/editar uma sessão: o aluno dono ou o personal com vínculo ativo.
create or replace function public.can_access_workout(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts workout
    where workout.id = target_workout_id
      and (workout.student_id = auth.uid() or public.is_active_trainer_of(workout.student_id))
  );
$$;

create or replace function public.can_edit_workout(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts workout
    where workout.id = target_workout_id
      and workout.finished_at is null and workout.discarded_at is null
      and (workout.student_id = auth.uid() or public.is_active_trainer_of(workout.student_id))
  );
$$;

revoke all on function public.can_access_workout(uuid) from public;
revoke all on function public.can_edit_workout(uuid) from public;
grant execute on function public.can_access_workout(uuid), public.can_edit_workout(uuid) to authenticated;

create policy workouts_select
on public.workouts for select
to authenticated
using (student_id = (select auth.uid()) or public.is_active_trainer_of(student_id));

create policy workouts_update_open
on public.workouts for update
to authenticated
using (public.can_edit_workout(id))
with check (public.can_edit_workout(id));

create policy workout_exercises_select
on public.workout_exercises for select
to authenticated
using (public.can_access_workout(workout_id));

create policy workout_exercises_write
on public.workout_exercises for all
to authenticated
using (public.can_edit_workout(workout_id))
with check (public.can_edit_workout(workout_id));

create policy workout_sets_select
on public.workout_sets for select
to authenticated
using (exists (
  select 1 from public.workout_exercises workout_exercise
  where workout_exercise.id = workout_sets.workout_exercise_id
    and public.can_access_workout(workout_exercise.workout_id)
));

create policy workout_sets_write
on public.workout_sets for all
to authenticated
using (exists (
  select 1 from public.workout_exercises workout_exercise
  where workout_exercise.id = workout_sets.workout_exercise_id
    and public.can_edit_workout(workout_exercise.workout_id)
))
with check (exists (
  select 1 from public.workout_exercises workout_exercise
  where workout_exercise.id = workout_sets.workout_exercise_id
    and public.can_edit_workout(workout_exercise.workout_id)
));

grant select, update on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises, public.workout_sets to authenticated;

-- Última série concluída do aluno em um exercício, por posição (para o "anterior").
create or replace function public.previous_set(
  target_student_id uuid,
  target_exercise_id uuid,
  target_position smallint
)
returns table (weight_kg numeric, reps smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select sets.weight_kg, sets.reps
  from public.workout_sets sets
  join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
  join public.workouts workout on workout.id = workout_exercise.workout_id
  where workout.student_id = target_student_id
    and workout.finished_at is not null and workout.discarded_at is null
    and workout_exercise.exercise_id = target_exercise_id
    and sets.completed_at is not null
  order by (sets.position = target_position) desc, workout.finished_at desc, sets.position desc
  limit 1;
$$;

revoke all on function public.previous_set(uuid, uuid, smallint) from public;

-- Inicia uma sessão: a partir de uma ficha (copia exercícios e séries-alvo),
-- de uma aula da agenda, ou livre. O personal informa o aluno; o aluno inicia para si.
create or replace function public.start_workout(
  target_routine_id uuid default null,
  target_appointment_id uuid default null,
  target_student_id uuid default null,
  workout_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  student uuid;
  trainer uuid;
  routine public.routines;
  appointment public.appointments;
  new_workout_id uuid;
  routine_exercise record;
  routine_set record;
  new_exercise_id uuid;
  previous record;
  resolved_name text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;

  if target_appointment_id is not null then
    select * into appointment from public.appointments where id = target_appointment_id;
    if appointment.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
    if actor <> appointment.student_id and actor <> appointment.trainer_id then
      raise exception 'APPOINTMENT_ACCESS_DENIED';
    end if;
    student := appointment.student_id;
    trainer := appointment.trainer_id;
  end if;

  if target_routine_id is not null then
    select * into routine from public.routines where id = target_routine_id and archived_at is null;
    if routine.id is null then raise exception 'ROUTINE_NOT_FOUND'; end if;
    if actor <> routine.trainer_id and actor <> routine.student_id then
      raise exception 'ROUTINE_ACCESS_DENIED';
    end if;
    student := coalesce(student, routine.student_id, target_student_id);
    trainer := coalesce(trainer, routine.trainer_id);
  end if;

  student := coalesce(student, target_student_id, actor);
  if student <> actor and not public.is_active_trainer_of(student) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;
  if trainer is null then
    select relationship.trainer_id into trainer
    from public.trainer_student_relationships relationship
    where relationship.student_id = student and relationship.status = 'active';
  end if;

  if exists (
    select 1 from public.workouts
    where student_id = student and finished_at is null and discarded_at is null
  ) then raise exception 'WORKOUT_ALREADY_OPEN'; end if;

  resolved_name := coalesce(
    nullif(btrim(workout_name), ''), routine.name,
    case when appointment.id is not null then 'Treino da aula' else 'Treino livre' end
  );

  insert into public.workouts (student_id, trainer_id, routine_id, appointment_id, name, recorded_by)
  values (student, trainer, routine.id, appointment.id, resolved_name, actor)
  returning id into new_workout_id;

  if routine.id is not null then
    for routine_exercise in
      select * from public.routine_exercises where routine_id = routine.id order by position
    loop
      insert into public.workout_exercises (workout_id, exercise_id, position, notes, rest_seconds)
      values (new_workout_id, routine_exercise.exercise_id, routine_exercise.position,
              routine_exercise.notes, routine_exercise.rest_seconds)
      returning id into new_exercise_id;

      for routine_set in
        select * from public.routine_sets where routine_exercise_id = routine_exercise.id order by position
      loop
        select * into previous
        from public.previous_set(student, routine_exercise.exercise_id, routine_set.position);
        insert into public.workout_sets (
          workout_exercise_id, position, weight_kg, reps, previous_weight_kg, previous_reps
        ) values (
          new_exercise_id, routine_set.position,
          coalesce(previous.weight_kg, routine_set.target_weight_kg),
          coalesce(previous.reps, routine_set.target_reps),
          previous.weight_kg, previous.reps
        );
      end loop;
    end loop;
  end if;

  return new_workout_id;
end;
$$;

revoke all on function public.start_workout(uuid, uuid, uuid, text) from public;
grant execute on function public.start_workout(uuid, uuid, uuid, text) to authenticated;

-- Adiciona um exercício a uma sessão aberta, já com uma série pré-preenchida pelo histórico.
create or replace function public.add_workout_exercise(target_workout_id uuid, target_exercise_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  new_exercise_id uuid;
  next_position smallint;
  previous record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_edit_workout(target_workout_id) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;
  select * into workout from public.workouts where id = target_workout_id;
  if not exists (select 1 from public.exercises where id = target_exercise_id) then
    raise exception 'EXERCISE_NOT_FOUND';
  end if;

  select coalesce(max(position) + 1, 0) into next_position
  from public.workout_exercises where workout_id = target_workout_id;

  insert into public.workout_exercises (workout_id, exercise_id, position, rest_seconds)
  values (target_workout_id, target_exercise_id, next_position, 90)
  returning id into new_exercise_id;

  select * into previous from public.previous_set(workout.student_id, target_exercise_id, 0::smallint);
  insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, previous_weight_kg, previous_reps)
  values (new_exercise_id, 0, previous.weight_kg, previous.reps, previous.weight_kg, previous.reps);

  return new_exercise_id;
end;
$$;

revoke all on function public.add_workout_exercise(uuid, uuid) from public;
grant execute on function public.add_workout_exercise(uuid, uuid) to authenticated;

-- Finaliza: descarta séries não concluídas e vazias, calcula duração e avisa o personal.
create or replace function public.finish_workout(target_workout_id uuid, workout_notes text default null)
returns public.workouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  completed_sets integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_edit_workout(target_workout_id) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;

  delete from public.workout_sets sets
  using public.workout_exercises workout_exercise
  where workout_exercise.id = sets.workout_exercise_id
    and workout_exercise.workout_id = target_workout_id
    and sets.completed_at is null;

  delete from public.workout_exercises workout_exercise
  where workout_exercise.workout_id = target_workout_id
    and not exists (select 1 from public.workout_sets where workout_exercise_id = workout_exercise.id);

  select count(*) into completed_sets
  from public.workout_sets sets
  join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
  where workout_exercise.workout_id = target_workout_id;
  if completed_sets = 0 then raise exception 'WORKOUT_HAS_NO_COMPLETED_SETS'; end if;

  update public.workouts
  set finished_at = now(),
      duration_seconds = least(86400, extract(epoch from (now() - started_at))::integer),
      notes = nullif(btrim(coalesce(workout_notes, '')), '')
  where id = target_workout_id
  returning * into workout;

  if workout.recorded_by = workout.student_id and workout.trainer_id is not null then
    perform public.notify_user(workout.trainer_id, 'workout_finished',
      public.display_name(workout.student_id) || ' finalizou um treino',
      workout.name || ' · ' || completed_sets || ' séries',
      '/app/alunos/' || workout.student_id);
  end if;

  return workout;
end;
$$;

revoke all on function public.finish_workout(uuid, text) from public;
grant execute on function public.finish_workout(uuid, text) to authenticated;

create or replace function public.discard_workout(target_workout_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_edit_workout(target_workout_id) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;
  update public.workouts set discarded_at = now() where id = target_workout_id;
end;
$$;

revoke all on function public.discard_workout(uuid) from public;
grant execute on function public.discard_workout(uuid) to authenticated;
