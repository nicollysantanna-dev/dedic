-- Fichas são compartilhadas: personal e aluno da ficha podem editar e arquivar.
-- Só o personal reatribui a ficha a outro aluno.

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
    -- Personal e aluno da ficha editam; só o personal reatribui o aluno.
    select student_id into previous_student from public.routines
    where id = current_routine_id and archived_at is null
      and (trainer_id = actor or student_id = actor) for update;
    if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
    if actor_role = 'trainer' then
      update public.routines
      set student_id = target_student, trainer_id = target_trainer, name = routine_name, notes = routine_notes
      where id = current_routine_id;
    else
      update public.routines set name = routine_name, notes = routine_notes
      where id = current_routine_id;
      previous_student := actor;
    end if;
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
  where id = target_routine_id and archived_at is null
    and (trainer_id = auth.uid() or student_id = auth.uid());
  if not found then raise exception 'ROUTINE_NOT_FOUND'; end if;
end;
$$;
