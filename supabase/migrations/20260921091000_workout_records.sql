-- T4: recordes por exercício (carga, 1RM estimado e volume), histórico de carga,
-- treinos no resumo de atividade e meta de carga por exercício.

-- 1. Recordes ficam gravados na série ao finalizar o treino (como no Hevy), para
-- aparecerem no histórico sem recomputar. O treino guarda quantos bateu.
alter table public.workout_sets add column record_kinds text[] not null default '{}';
alter table public.workouts add column record_count integer not null default 0;

create or replace function public.estimate_one_rm(weight_kg numeric, reps integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when weight_kg is null or reps is null or weight_kg <= 0 or reps <= 0 then null
    when reps = 1 then weight_kg
    else round(weight_kg * (1 + reps / 30.0), 1)
  end;
$$;

create or replace function public.finish_workout(target_workout_id uuid, workout_notes text default null)
returns public.workouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout public.workouts;
  completed_sets integer;
  records integer := 0;
  current_set record;
  best record;
  kinds text[];
  set_one_rm numeric;
  set_volume numeric;
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

  select * into workout from public.workouts where id = target_workout_id;

  -- Melhores marcas anteriores do aluno por exercício (treinos finalizados).
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
    and previous_workout.finished_at is not null and previous_workout.discarded_at is null
    and previous_set.set_type <> 'warmup'
    and previous_set.weight_kg > 0 and previous_set.reps > 0
  group by previous_exercise.exercise_id;

  -- Cada série é comparada ao melhor anterior (incluindo séries já percorridas
  -- deste treino), na ordem da sessão.
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

  update public.workouts
  set finished_at = now(),
      duration_seconds = least(86400, extract(epoch from (now() - started_at))::integer),
      notes = nullif(btrim(coalesce(workout_notes, '')), ''),
      record_count = records
  where id = target_workout_id
  returning * into workout;

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

-- 2. Recordes atuais por exercício e aluno (derivados, como o saldo de créditos).
create or replace view public.exercise_records
with (security_invoker = true)
as
select
  workout.student_id,
  workout_exercise.exercise_id,
  max(sets.weight_kg) as best_weight_kg,
  max(public.estimate_one_rm(sets.weight_kg, sets.reps)) as best_one_rm,
  max(sets.weight_kg * sets.reps) as best_volume,
  max(workout.finished_at) as last_performed_at,
  count(distinct workout.id)::integer as sessions_count
from public.workout_sets sets
join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
join public.workouts workout on workout.id = workout_exercise.workout_id
where workout.finished_at is not null and workout.discarded_at is null
  and sets.set_type <> 'warmup'
  and sets.weight_kg > 0 and sets.reps > 0
group by workout.student_id, workout_exercise.exercise_id;

grant select on public.exercise_records to authenticated;

-- 3. Carga ao longo do tempo: uma linha por treino e exercício (gráfico de progresso).
create or replace view public.exercise_workout_stats
with (security_invoker = true)
as
select
  workout.student_id,
  workout_exercise.exercise_id,
  workout.id as workout_id,
  workout.finished_at,
  max(sets.weight_kg) as max_weight_kg,
  max(public.estimate_one_rm(sets.weight_kg, sets.reps)) as best_one_rm,
  sum(sets.weight_kg * sets.reps) as volume,
  count(*)::integer as sets_count
from public.workout_sets sets
join public.workout_exercises workout_exercise on workout_exercise.id = sets.workout_exercise_id
join public.workouts workout on workout.id = workout_exercise.workout_id
where workout.finished_at is not null and workout.discarded_at is null
  and sets.set_type <> 'warmup'
  and sets.weight_kg > 0 and sets.reps > 0
group by workout.student_id, workout_exercise.exercise_id, workout.id, workout.finished_at;

grant select on public.exercise_workout_stats to authenticated;

-- 4. Meta de carga por exercício: alvo em kg; o valor atual vem de exercise_records.
alter table public.student_goals add column exercise_id uuid references public.exercises (id);
alter table public.student_goals
  add constraint goal_exercise_matches_kind check (
    (kind = 'exercise_load' and exercise_id is not null)
    or (kind <> 'exercise_load' and exercise_id is null)
  );

-- 5. Resumo de atividade ganha treinos registrados (últimos 30 dias e último).
drop view public.student_activity_summary;
create view public.student_activity_summary
with (security_invoker = true)
as
with active_relationships as (
  select relationship.id as relationship_id, relationship.trainer_id, relationship.student_id,
         relationship.started_at
  from public.trainer_student_relationships relationship
  where relationship.status = 'active'
),
lesson_stats as (
  select
    appointment.trainer_id,
    appointment.student_id,
    count(*) filter (where appointment.status = 'completed'
      and appointment.ends_at >= now() - interval '30 days') as completed_30d,
    count(*) filter (where appointment.status = 'student_no_show'
      and appointment.ends_at >= now() - interval '30 days') as no_show_30d,
    count(*) filter (where appointment.status = 'completed'
      and appointment.ends_at >= now() - interval '28 days') as completed_28d,
    count(*) filter (where appointment.status = 'completed') as completed_total,
    count(*) filter (where appointment.status = 'student_no_show') as no_show_total,
    max(appointment.ends_at) filter (where appointment.status = 'completed') as last_completed_at,
    min(appointment.starts_at) filter (where appointment.status = 'scheduled'
      and appointment.starts_at >= now()) as next_appointment_at,
    count(*) filter (where appointment.status = 'scheduled'
      and appointment.starts_at >= now()) as upcoming_count
  from public.appointments appointment
  group by appointment.trainer_id, appointment.student_id
),
credit_balance as (
  select transaction.student_id, coalesce(sum(transaction.amount), 0)::integer as balance
  from public.credit_transactions transaction
  join public.lesson_packages package on package.id = transaction.package_id
  where package.status = 'active'
  group by transaction.student_id
),
package_renewal as (
  select package.student_id, min(package.expires_on) as next_renewal_on
  from public.lesson_packages package
  where package.status = 'active'
  group by package.student_id
),
payment_stats as (
  select
    payment.student_id,
    count(*) filter (where payment.status = 'overdue'
      or (payment.status = 'pending' and payment.due_on < public.local_today())) as overdue_count,
    count(*) filter (where payment.status = 'pending' and payment.due_on >= public.local_today()) as pending_count,
    min(payment.due_on) filter (where payment.status in ('pending', 'overdue')) as next_due_on
  from public.payments payment
  group by payment.student_id
),
progress_stats as (
  select entry.student_id, max(entry.recorded_on) as last_progress_on
  from public.progress_entries entry
  group by entry.student_id
),
goal_stats as (
  select
    goal.student_id,
    count(*) filter (where goal.status = 'active') as active_goals,
    count(*) filter (where goal.status = 'active' and goal.target_date < public.local_today()) as overdue_goals,
    max(goal.target_value) filter (where goal.status = 'active' and goal.kind = 'attendance') as attendance_goal_per_week
  from public.student_goals goal
  group by goal.student_id
),
workout_stats as (
  select
    workout.student_id,
    count(*) filter (where workout.finished_at >= now() - interval '30 days') as workouts_30d,
    max(workout.finished_at) as last_workout_at
  from public.workouts workout
  where workout.finished_at is not null and workout.discarded_at is null
  group by workout.student_id
)
select
  relationship.relationship_id,
  relationship.trainer_id,
  relationship.student_id,
  relationship.started_at,
  profile.full_name,
  profile.phone,
  coalesce(balance.balance, 0) as balance,
  renewal.next_renewal_on,
  coalesce(stats.completed_30d, 0)::integer as completed_30d,
  coalesce(stats.no_show_30d, 0)::integer as no_show_30d,
  coalesce(stats.completed_total, 0)::integer as completed_total,
  coalesce(stats.no_show_total, 0)::integer as no_show_total,
  case
    when coalesce(stats.completed_total, 0) + coalesce(stats.no_show_total, 0) = 0 then null
    else round(100.0 * stats.completed_total / (stats.completed_total + stats.no_show_total))::integer
  end as attendance_rate,
  round(coalesce(stats.completed_28d, 0) / 4.0, 1) as weekly_average_4w,
  stats.last_completed_at,
  stats.next_appointment_at,
  coalesce(stats.upcoming_count, 0)::integer as upcoming_count,
  coalesce(payment.overdue_count, 0)::integer as overdue_payments,
  coalesce(payment.pending_count, 0)::integer as pending_payments,
  payment.next_due_on,
  progress.last_progress_on,
  coalesce(goals.active_goals, 0)::integer as active_goals,
  coalesce(goals.overdue_goals, 0)::integer as overdue_goals,
  goals.attendance_goal_per_week,
  coalesce(workouts.workouts_30d, 0)::integer as workouts_30d,
  workouts.last_workout_at
from active_relationships relationship
join public.profiles profile on profile.id = relationship.student_id
left join lesson_stats stats
  on stats.trainer_id = relationship.trainer_id and stats.student_id = relationship.student_id
left join credit_balance balance on balance.student_id = relationship.student_id
left join package_renewal renewal on renewal.student_id = relationship.student_id
left join payment_stats payment on payment.student_id = relationship.student_id
left join progress_stats progress on progress.student_id = relationship.student_id
left join goal_stats goals on goals.student_id = relationship.student_id
left join workout_stats workouts on workouts.student_id = relationship.student_id;

grant select on public.student_activity_summary to authenticated;
