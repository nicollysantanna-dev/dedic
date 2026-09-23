-- Expõe a foto de perfil do aluno na vista usada pela lista de alunos do
-- personal. Mesma definição da vista anterior (20260921091000), apenas com
-- profile.avatar_path adicionado ao select final.

create or replace view public.student_activity_summary
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
    count(*) filter (
      where goal.status = 'active' and goal.target_date < public.local_today()
    ) as overdue_goals,
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
  workouts.last_workout_at,
  profile.avatar_path
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
