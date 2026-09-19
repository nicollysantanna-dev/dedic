-- M7a: aula avulsa, criação atômica de pacote com cobrança, atraso automático
-- de pagamentos e notificações internas geradas por triggers (RF-17, RF-26, RF-27).

-- 1. Tipo de contratação: pacote ou aula avulsa (ADR 0005, D7).
create type public.package_kind as enum ('package', 'single');

alter table public.lesson_packages
  add column kind public.package_kind not null default 'package';

alter table public.lesson_packages
  add constraint single_lesson_has_one_credit check (kind <> 'single' or lesson_count = 1);

-- 2. Notificações internas.
create type public.notification_kind as enum (
  'appointment_created',
  'appointment_cancelled',
  'appointment_rescheduled',
  'credits_changed',
  'payment_due',
  'payment_overdue',
  'payment_received',
  'goal_created',
  'progress_recorded'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  body text check (body is null or char_length(body) <= 300),
  link text check (link is null or link ~ '^/app(/|$)'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = (select auth.uid()));

grant select on public.notifications to authenticated;

-- Só o próprio usuário marca como lida; nada mais é editável.
create or replace function public.mark_notifications_read(target_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (target_ids is null or id = any(target_ids));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create or replace function public.notify_user(
  target_user_id uuid,
  notification_kind public.notification_kind,
  notification_title text,
  notification_body text default null,
  notification_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (target_user_id, notification_kind, left(notification_title, 120),
          left(notification_body, 300), notification_link);
$$;

revoke all on function public.notify_user(uuid, public.notification_kind, text, text, text) from public;

create or replace function public.display_name(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(split_part(full_name, ' ', 1), 'Alguém') from public.profiles where id = target_user_id;
$$;

revoke all on function public.display_name(uuid) from public;

-- Valor em reais no formato brasileiro (R$ 1.234,56).
create or replace function public.format_brl(cents integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'R$ ' || replace(replace(replace(
    to_char(cents / 100.0, 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.');
$$;

create or replace function public.format_lesson_moment(moment timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(moment at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');
$$;

-- 2a. Aulas: criação, cancelamento e remarcação notificam a outra parte.
create or replace function public.notify_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := coalesce(auth.uid(), new.created_by);
  counterpart uuid;
  moment text := public.format_lesson_moment(new.starts_at);
begin
  counterpart := case when actor = new.trainer_id then new.student_id else new.trainer_id end;

  if tg_op = 'INSERT' then
    if new.rescheduled_from_id is not null then
      perform public.notify_user(counterpart, 'appointment_rescheduled',
        'Aula remarcada para ' || moment,
        public.display_name(actor) || ' remarcou a aula.',
        '/app/agenda?aula=' || new.id);
    elsif actor <> counterpart then
      perform public.notify_user(counterpart, 'appointment_created',
        'Nova aula em ' || moment,
        public.display_name(actor) || ' agendou uma aula com você.',
        '/app/agenda?aula=' || new.id);
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'scheduled'
    and new.status in ('cancelled_by_student', 'cancelled_by_trainer') then
    perform public.notify_user(counterpart, 'appointment_cancelled',
      'Aula de ' || moment || ' cancelada',
      public.display_name(actor) || ' cancelou a aula.',
      '/app/agenda?aula=' || new.id);
  end if;

  return new;
end;
$$;

create trigger appointments_notify_change
after insert or update of status on public.appointments
for each row execute function public.notify_appointment_change();

-- 2b. Créditos: ativação, devolução e ajuste notificam o aluno.
create or replace function public.notify_credit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_type in ('package_activation', 'manual_adjustment', 'cancellation_refund') then
    perform public.notify_user(new.student_id, 'credits_changed',
      case
        when new.transaction_type = 'package_activation'
          then new.amount || case when new.amount = 1 then ' crédito adicionado' else ' créditos adicionados' end
        when new.transaction_type = 'cancellation_refund' then '1 crédito devolvido'
        when new.amount > 0 then '+' || new.amount || ' crédito(s) de ajuste'
        else new.amount || ' crédito(s) de ajuste'
      end,
      new.reason,
      '/app/creditos');
  end if;
  return new;
end;
$$;

create trigger credit_transactions_notify
after insert on public.credit_transactions
for each row execute function public.notify_credit_change();

-- 2c. Pagamentos: cobrança e atraso notificam o aluno; baixa notifica o personal.
create or replace function public.notify_payment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  amount text := public.format_brl(new.amount_cents);
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify_user(new.student_id, 'payment_due',
      'Cobrança de ' || amount,
      'Vencimento em ' || to_char(new.due_on, 'DD/MM/YYYY') || '.',
      '/app/financeiro');
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'overdue' then
      perform public.notify_user(new.student_id, 'payment_overdue',
        'Pagamento de ' || amount || ' em atraso',
        'Venceu em ' || to_char(new.due_on, 'DD/MM/YYYY') || '.',
        '/app/financeiro');
    elsif new.status = 'paid' then
      perform public.notify_user(new.student_id, 'payment_received',
        'Pagamento de ' || amount || ' confirmado', null, '/app/financeiro');
    end if;
  end if;
  return new;
end;
$$;

create trigger payments_notify_change
after insert or update of status on public.payments
for each row execute function public.notify_payment_change();

-- 2d. Metas e progresso.
create or replace function public.notify_goal_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_user(new.student_id, 'goal_created',
    'Nova meta definida pelo seu personal',
    case when new.kind = 'weight'
      then 'Peso: ' || new.initial_value || ' → ' || new.target_value || ' kg até ' || to_char(new.target_date, 'DD/MM')
      else 'Frequência: ' || new.target_value || ' aulas por semana até ' || to_char(new.target_date, 'DD/MM')
    end,
    '/app/evolucao');
  return new;
end;
$$;

create trigger student_goals_notify
after insert on public.student_goals
for each row execute function public.notify_goal_created();

create or replace function public.notify_progress_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer uuid;
begin
  if new.recorded_by <> new.student_id then return new; end if;
  select relationship.trainer_id into trainer
  from public.trainer_student_relationships relationship
  where relationship.student_id = new.student_id and relationship.status = 'active';
  if trainer is not null then
    perform public.notify_user(trainer, 'progress_recorded',
      public.display_name(new.student_id) || ' registrou progresso',
      case when new.weight_kg is not null then 'Peso: ' || new.weight_kg || ' kg' else 'Novas medidas' end,
      '/app/alunos/' || new.student_id);
  end if;
  return new;
end;
$$;

create trigger progress_entries_notify
after insert on public.progress_entries
for each row execute function public.notify_progress_recorded();

-- 3. Data de hoje no fuso do produto (ADR 0005, D4): evita virar o dia às 21h.
create or replace function public.local_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

grant execute on function public.local_today() to authenticated;

-- Pagamento pendente vira atrasado automaticamente após o vencimento.
create or replace function public.mark_overdue_payments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  with overdue as (
    update public.payments
    set status = 'overdue'
    where status = 'pending' and due_on < public.local_today()
    returning *
  )
  insert into public.payment_events (
    payment_id, trainer_id, student_id, status, amount_cents, due_on, paid_on, actor_id
  )
  select id, trainer_id, student_id, status, amount_cents, due_on, paid_on, trainer_id
  from overdue;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_overdue_payments() from public, anon, authenticated;

select cron.schedule(
  'dedic-mark-overdue-payments',
  '5 3 * * *',
  'select public.mark_overdue_payments();'
);

-- 4. Criação atômica de pacote/aula avulsa, com ativação e cobrança opcionais.
create or replace function public.create_lesson_package(
  target_student_id uuid,
  requested_kind public.package_kind,
  requested_lesson_count smallint,
  requested_price_cents integer,
  requested_starts_on date,
  requested_expires_on date,
  activate_now boolean default true,
  create_charge boolean default true,
  charge_due_on date default null
)
returns public.lesson_packages
language plpgsql
security definer
set search_path = ''
as $$
declare
  relationship public.trainer_student_relationships;
  package public.lesson_packages;
  lesson_count smallint := case when requested_kind = 'single' then 1 else requested_lesson_count end;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into relationship from public.trainer_student_relationships
  where trainer_id = auth.uid() and student_id = target_student_id and status = 'active';
  if relationship.id is null then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;

  insert into public.lesson_packages (
    trainer_id, student_id, relationship_id, kind, lesson_count, price_cents,
    starts_on, expires_on
  ) values (
    auth.uid(), target_student_id, relationship.id, requested_kind, lesson_count,
    requested_price_cents, requested_starts_on, requested_expires_on
  ) returning * into package;

  if activate_now then
    package := public.activate_lesson_package(package.id);
  end if;

  if create_charge and requested_price_cents > 0 then
    perform public.save_payment(
      gen_random_uuid(), package.id, requested_price_cents,
      coalesce(charge_due_on, requested_starts_on), 'pending', null
    );
  end if;

  return package;
end;
$$;

revoke all on function public.create_lesson_package(uuid, public.package_kind, smallint, integer, date, date, boolean, boolean, date) from public;
grant execute on function public.create_lesson_package(uuid, public.package_kind, smallint, integer, date, date, boolean, boolean, date) to authenticated;

-- 5. A vista de atividade passa a usar a data local para prazos e atrasos.
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
    count(*) filter (where goal.status = 'active' and goal.target_date < public.local_today()) as overdue_goals,
    max(goal.target_value) filter (where goal.status = 'active' and goal.kind = 'attendance') as attendance_goal_per_week
  from public.student_goals goal
  group by goal.student_id
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
  goals.attendance_goal_per_week
from active_relationships relationship
join public.profiles profile on profile.id = relationship.student_id
left join lesson_stats stats
  on stats.trainer_id = relationship.trainer_id and stats.student_id = relationship.student_id
left join credit_balance balance on balance.student_id = relationship.student_id
left join package_renewal renewal on renewal.student_id = relationship.student_id
left join payment_stats payment on payment.student_id = relationship.student_id
left join progress_stats progress on progress.student_id = relationship.student_id
left join goal_stats goals on goals.student_id = relationship.student_id;

