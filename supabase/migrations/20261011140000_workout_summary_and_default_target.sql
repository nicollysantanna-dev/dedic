-- Card compartilhável pós-treino (spec 2026-10-11) e meta semanal padrão 5.

-- Meta semanal: meta de frequência ativa; sem meta, 5. Semanas já fechadas guardam
-- a meta da época e não mudam.
create or replace function public.weekly_check_in_target(target_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select greatest(round(goal.target_value)::integer, 1)
      from public.student_goals goal
      where goal.student_id = target_student_id
        and goal.kind = 'attendance'
        and goal.status = 'active'
      order by goal.created_at desc
      limit 1
    ),
    5
  );
$$;

-- Números e conquistas de um treino finalizado, para o resumo e o card.
create function public.workout_summary(target_workout_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  workout_day date;
  week_start date;
  first_of_day boolean;
  week_check_ins integer;
  week_target integer;
  completed_sets integer;
  volume numeric;
  new_codes jsonb;
  record_exercises integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into workout from public.workouts where id = target_workout_id;
  if workout.id is null then raise exception 'WORKOUT_NOT_FOUND'; end if;
  if auth.uid() <> workout.student_id and not public.is_active_trainer_of(workout.student_id) then
    raise exception 'WORKOUT_ACCESS_DENIED';
  end if;
  if workout.finished_at is null or workout.discarded_at is not null then
    raise exception 'WORKOUT_NOT_FINISHED';
  end if;

  -- Mesmo dia de check-in de student_check_ins: o dia local do início do treino.
  workout_day := (workout.started_at at time zone 'America/Sao_Paulo')::date;
  week_start := public.week_start_of(workout_day);

  -- Este treino criou o check-in do dia se nenhum treino anterior (pela ordem de
  -- finalização e, no empate, de início) nem aula concluída já ocupava o dia.
  first_of_day := not exists (
    select 1
    from public.workouts other
    where other.student_id = workout.student_id
      and other.id <> workout.id
      and other.finished_at is not null
      and other.discarded_at is null
      and (other.started_at at time zone 'America/Sao_Paulo')::date = workout_day
      and (other.finished_at, other.started_at, other.id)
        < (workout.finished_at, workout.started_at, workout.id)
  ) and not exists (
    select 1
    from public.appointments appointment
    where appointment.student_id = workout.student_id
      and appointment.status = 'completed'
      and (appointment.starts_at at time zone 'America/Sao_Paulo')::date = workout_day
  );

  select count(*)::integer into week_check_ins
  from public.student_check_ins check_in
  where check_in.student_id = workout.student_id
    and check_in.day between week_start and workout_day;
  week_target := public.weekly_check_in_target(workout.student_id);

  select count(*)::integer, coalesce(sum(coalesce(sets.weight_kg, 0) * coalesce(sets.reps, 0)), 0)
  into completed_sets, volume
  from public.workout_sets sets
  join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
  where workout_exercise.workout_id = workout.id
    and sets.completed_at is not null;

  -- finish_workout grava finished_at e concede medalhas na mesma transação.
  select coalesce(jsonb_agg(achievement.code order by achievement.code), '[]'::jsonb)
  into new_codes
  from public.student_achievements achievement
  where achievement.student_id = workout.student_id
    and achievement.earned_at = workout.finished_at;

  -- Recorde só conta se o aluno já tinha uma marca válida no exercício (mesma base de
  -- apply_workout_records: outros treinos finalizados e não descartados).
  select count(distinct workout_exercise.exercise_id)::integer into record_exercises
  from public.workout_exercises workout_exercise
  join public.workout_sets sets on sets.workout_exercise_id = workout_exercise.id
  where workout_exercise.workout_id = workout.id
    and cardinality(sets.record_kinds) > 0
    and exists (
      select 1
      from public.workout_sets previous_set
      join public.workout_exercises previous_exercise
        on previous_exercise.id = previous_set.workout_exercise_id
      join public.workouts previous_workout on previous_workout.id = previous_exercise.workout_id
      where previous_workout.student_id = workout.student_id
        and previous_workout.id <> workout.id
        and previous_workout.finished_at is not null
        and previous_workout.discarded_at is null
        and previous_exercise.exercise_id = workout_exercise.exercise_id
        and previous_set.weight_kg > 0
        and previous_set.reps > 0
        and previous_set.set_type <> 'warmup'
    );

  return jsonb_build_object(
    'name', workout.name,
    'finished_at', workout.finished_at,
    'duration_seconds', coalesce(workout.duration_seconds, 0),
    'sets', completed_sets,
    'volume_kg', volume,
    'week', jsonb_build_object(
      'check_ins', week_check_ins,
      'target', week_target,
      'met_now', first_of_day and week_check_ins = week_target
    ),
    'new_achievements', new_codes,
    'records', record_exercises,
    'recorded_by_student', workout.recorded_by = workout.student_id
  );
end;
$$;

revoke all on function public.workout_summary(uuid) from public, anon;
grant execute on function public.workout_summary(uuid) to authenticated;
