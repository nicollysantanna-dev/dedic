-- Extrai o cálculo de recordes de finish_workout() para uma função reutilizável,
-- para que a futura importação de treinos do Hevy (inserção retroativa em lote)
-- também gere recordes corretos sem duplicar a lógica de comparação sequencial.

-- 1. Cálculo de recordes de um treino já finalizado, isolado de finish_workout().
-- Compara cada série (na ordem da sessão) ao melhor anterior do aluno, olhando só
-- outros treinos com data igual ou anterior — necessário para inserções
-- retroativas, onde "anterior" não é "tudo que já existe no banco" e sim "tudo
-- com data até a deste treino". Empate de data conta como anterior (em vez de
-- desempatar por id, que é aleatório): dois finish_workout() na mesma
-- transação podem ter o mesmo now(), e um id aleatoriamente "maior" não deve
-- fazer um treino perder a comparação com o outro.
create or replace function public.apply_workout_records(target_workout_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  records integer := 0;
  current_set record;
  best record;
  kinds text[];
  set_one_rm numeric;
  set_volume numeric;
begin
  select * into workout from public.workouts where id = target_workout_id;
  if workout.id is null then raise exception 'WORKOUT_NOT_FOUND'; end if;
  if workout.finished_at is null then raise exception 'WORKOUT_NOT_FINISHED'; end if;

  drop table if exists running_best;
  create temporary table running_best on commit drop as
  select
    previous_exercise.exercise_id,
    max(previous_set.weight_kg) as weight_kg,
    max(public.estimate_one_rm(previous_set.weight_kg, previous_set.reps)) as one_rm,
    max(previous_set.weight_kg * previous_set.reps) as volume
  from public.workout_sets previous_set
  join public.workout_exercises previous_exercise on previous_exercise.id = previous_set.workout_exercise_id
  join public.workouts previous_workout on previous_workout.id = previous_exercise.workout_id
  where previous_workout.student_id = workout.student_id
    and previous_workout.id <> workout.id
    and previous_workout.finished_at is not null and previous_workout.discarded_at is null
    and previous_workout.finished_at <= workout.finished_at
    and previous_set.set_type <> 'warmup'
    and previous_set.weight_kg > 0 and previous_set.reps > 0
  group by previous_exercise.exercise_id;

  for current_set in
    select sets.id, sets.weight_kg, sets.reps, workout_exercise.exercise_id
    from public.workout_sets sets
    join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
    where workout_exercise.workout_id = target_workout_id
      and sets.set_type <> 'warmup'
      and sets.weight_kg > 0 and sets.reps > 0
    order by workout_exercise.position, sets.position
  loop
    kinds := '{}';
    set_one_rm := public.estimate_one_rm(current_set.weight_kg, current_set.reps);
    set_volume := current_set.weight_kg * current_set.reps;
    select * into best from running_best where exercise_id = current_set.exercise_id;
    if best.exercise_id is null then
      insert into running_best values (current_set.exercise_id, 0, 0, 0);
      select * into best from running_best where exercise_id = current_set.exercise_id;
    end if;
    if current_set.weight_kg > best.weight_kg then kinds := array_append(kinds, 'weight'); end if;
    if set_one_rm > best.one_rm then kinds := array_append(kinds, 'one_rm'); end if;
    if set_volume > best.volume then kinds := array_append(kinds, 'volume'); end if;
    if cardinality(kinds) > 0 then
      update public.workout_sets set record_kinds = kinds where id = current_set.id;
      update running_best
      set weight_kg = greatest(weight_kg, current_set.weight_kg),
          one_rm = greatest(one_rm, set_one_rm),
          volume = greatest(volume, set_volume)
      where exercise_id = current_set.exercise_id;
      records := records + 1;
    end if;
  end loop;

  drop table running_best;

  update public.workouts set record_count = records where id = target_workout_id;

  return records;
end;
$$;

revoke all on function public.apply_workout_records(uuid) from public;
grant execute on function public.apply_workout_records(uuid) to service_role;

-- 2. finish_workout() passa a gravar finished_at primeiro e delegar o cálculo de
-- recordes a apply_workout_records() (que depende de finished_at já estar salvo
-- para decidir o que conta como "anterior").
create or replace function public.finish_workout(target_workout_id uuid, workout_notes text default null)
returns public.workouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  completed_sets integer;
  records integer;
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
  where id = target_workout_id;

  records := public.apply_workout_records(target_workout_id);

  select * into workout from public.workouts where id = target_workout_id;

  if workout.recorded_by = workout.student_id and workout.trainer_id is not null then
    perform public.notify_user(workout.trainer_id, 'workout_finished',
      public.display_name(workout.student_id) || ' finalizou um treino',
      workout.name || ' · ' || completed_sets || ' séries'
        || case when records > 0 then ' · ' || records || ' recorde(s)' else '' end,
      '/app/alunos/' || workout.student_id);
  end if;

  return workout;
end;
$$;

revoke all on function public.finish_workout(uuid, text) from public;
grant execute on function public.finish_workout(uuid, text) to authenticated;

-- 3. Reconstrói recordes de todo o histórico de um aluno em uma única passada
-- (O(n) nas séries, não O(n²) chamando apply_workout_records por treino). Uso:
-- corrigir recordes quando uma sincronização externa (ex.: Hevy) traz um treino
-- mais antigo que treinos já commitados, que pode invalidar recordes posteriores
-- já gravados. Só service_role: ferramenta de manutenção, não ação do usuário.
create or replace function public.recompute_workout_records(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_set record;
  best record;
  kinds text[];
  set_one_rm numeric;
  set_volume numeric;
begin
  update public.workout_sets sets
  set record_kinds = '{}'
  from public.workout_exercises workout_exercise, public.workouts workout
  where workout_exercise.id = sets.workout_exercise_id
    and workout.id = workout_exercise.workout_id
    and workout.student_id = target_student_id;

  update public.workouts set record_count = 0 where student_id = target_student_id;

  drop table if exists running_best;
  create temporary table running_best (
    exercise_id uuid primary key,
    weight_kg numeric not null default 0,
    one_rm numeric not null default 0,
    volume numeric not null default 0
  ) on commit drop;

  drop table if exists workout_counts;
  create temporary table workout_counts (
    workout_id uuid primary key,
    records integer not null default 0
  ) on commit drop;

  for current_set in
    select sets.id, sets.weight_kg, sets.reps, workout_exercise.exercise_id, workout.id as workout_id
    from public.workout_sets sets
    join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
    join public.workouts workout on workout.id = workout_exercise.workout_id
    where workout.student_id = target_student_id
      and workout.finished_at is not null and workout.discarded_at is null
      and sets.set_type <> 'warmup'
      and sets.weight_kg > 0 and sets.reps > 0
    order by workout.finished_at, workout.id, workout_exercise.position, sets.position
  loop
    kinds := '{}';
    set_one_rm := public.estimate_one_rm(current_set.weight_kg, current_set.reps);
    set_volume := current_set.weight_kg * current_set.reps;
    select * into best from running_best where exercise_id = current_set.exercise_id;
    if best.exercise_id is null then
      insert into running_best values (current_set.exercise_id, 0, 0, 0);
      select * into best from running_best where exercise_id = current_set.exercise_id;
    end if;
    if current_set.weight_kg > best.weight_kg then kinds := array_append(kinds, 'weight'); end if;
    if set_one_rm > best.one_rm then kinds := array_append(kinds, 'one_rm'); end if;
    if set_volume > best.volume then kinds := array_append(kinds, 'volume'); end if;
    if cardinality(kinds) > 0 then
      update public.workout_sets set record_kinds = kinds where id = current_set.id;
      update running_best
      set weight_kg = greatest(weight_kg, current_set.weight_kg),
          one_rm = greatest(one_rm, set_one_rm),
          volume = greatest(volume, set_volume)
      where exercise_id = current_set.exercise_id;
      insert into workout_counts (workout_id, records) values (current_set.workout_id, 1)
      on conflict (workout_id) do update set records = workout_counts.records + 1;
    end if;
  end loop;

  update public.workouts w
  set record_count = wc.records
  from workout_counts wc
  where wc.workout_id = w.id;

  drop table running_best;
  drop table workout_counts;
end;
$$;

revoke all on function public.recompute_workout_records(uuid) from public;
grant execute on function public.recompute_workout_records(uuid) to service_role;
