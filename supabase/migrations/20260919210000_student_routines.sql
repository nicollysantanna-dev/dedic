-- Aluno também monta as próprias fichas (estilo Hevy). A ficha passa a ter um
-- dono (created_by): o personal edita as que criou; o aluno edita as que criou.
-- Fichas do personal continuam visíveis ao aluno em modo leitura, e vice-versa.

alter table public.routines alter column trainer_id drop not null;
alter table public.routines add column created_by uuid references public.profiles (id);
update public.routines set created_by = trainer_id where created_by is null;
alter table public.routines alter column created_by set not null;
alter table public.routines
  add constraint routine_has_owner check (trainer_id is not null or student_id is not null);

create or replace function public.save_routine(routine jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
  current_routine_id uuid := nullif(routine ->> 'id', '')::uuid;
  target_student uuid := nullif(routine ->> 'student_id', '')::uuid;
  target_trainer uuid;
  routine_name text := btrim(routine ->> 'name');
  routine_notes text := nullif(btrim(coalesce(routine ->> 'notes', '')), '');
  exercise jsonb;
  set_item jsonb;
  exercise_position integer := 0;
  set_position integer;
  routine_exercise_id uuid;
  previous_student uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into actor_role from public.profiles where id = actor;
  if routine_name is null or char_length(routine_name) < 2 then raise exception 'INVALID_ROUTINE_NAME'; end if;
  if jsonb_typeof(routine -> 'exercises') <> 'array' or jsonb_array_length(routine -> 'exercises') = 0 then
    raise exception 'ROUTINE_NEEDS_EXERCISES';
  end if;

  if actor_role = 'trainer' then
    target_trainer := actor;
    if target_student is not null and not public.is_active_trainer_of(target_student) then
      raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
    end if;
  else
    -- Aluno: a ficha é sempre dele; o personal vinculado (se houver) fica como referência.
    target_student := actor;
    select relationship.trainer_id into target_trainer
    from public.trainer_student_relationships relationship
    where relationship.student_id = actor and relationship.status = 'active';
  end if;

  if current_routine_id is null then
    insert into public.routines (trainer_id, student_id, name, notes, created_by)
    values (target_trainer, target_student, routine_name, routine_notes, actor)
    returning id into current_routine_id;
  else
    select student_id into previous_student from public.routines
    where id = current_routine_id and created_by = actor and archived_at is null for update;
    if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
    update public.routines
    set student_id = target_student, trainer_id = target_trainer, name = routine_name, notes = routine_notes
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

  -- Só o personal atribuindo uma ficha a um aluno gera aviso.
  if actor_role = 'trainer' and target_student is not null
     and (previous_student is null or previous_student <> target_student) then
    perform public.notify_user(target_student, 'routine_assigned',
      'Nova ficha: ' || routine_name,
      'Seu personal montou uma ficha para você.',
      '/app/treinos');
  end if;

  return current_routine_id;
end;
$$;

create or replace function public.archive_routine(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.routines set archived_at = now()
  where id = target_routine_id and created_by = auth.uid() and archived_at is null;
  if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.duplicate_routine(target_routine_id uuid, target_student_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
  source public.routines;
  new_id uuid;
  new_student uuid;
  new_trainer uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into actor_role from public.profiles where id = actor;
  -- Pode copiar qualquer ficha que consegue ler (a própria ou a recebida).
  select * into source from public.routines
  where id = target_routine_id and (trainer_id = actor or student_id = actor);
  if source.id is null then raise exception 'ROUTINE_NOT_FOUND'; end if;

  if actor_role = 'trainer' then
    new_trainer := actor;
    new_student := target_student_id;
    if new_student is not null and not public.is_active_trainer_of(new_student) then
      raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
    end if;
  else
    new_student := actor;
    select relationship.trainer_id into new_trainer
    from public.trainer_student_relationships relationship
    where relationship.student_id = actor and relationship.status = 'active';
  end if;

  insert into public.routines (trainer_id, student_id, name, notes, created_by)
  values (new_trainer, new_student, source.name || ' (cópia)', source.notes, actor)
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

  if actor_role = 'trainer' and new_student is not null then
    perform public.notify_user(new_student, 'routine_assigned',
      'Nova ficha: ' || source.name, 'Seu personal montou uma ficha para você.', '/app/treinos');
  end if;
  return new_id;
end;
$$;

-- start_workout: uma ficha do próprio aluno pode não ter personal.
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
    if actor is distinct from routine.trainer_id and actor is distinct from routine.student_id then
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
