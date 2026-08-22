create type public.payment_status as enum ('pending', 'paid', 'overdue', 'cancelled');

create table public.payments (
  id uuid primary key,
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  package_id uuid not null references public.lesson_packages (id),
  amount_cents integer not null check (amount_cents > 0),
  due_on date not null,
  status public.payment_status not null default 'pending',
  paid_on date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_paid_date_required check (
    (status = 'paid' and paid_on is not null)
    or (status <> 'paid' and paid_on is null)
  ),
  constraint payment_package_parties foreign key (package_id, trainer_id, student_id)
    references public.lesson_packages (id, trainer_id, student_id)
);

create index payments_student_due_idx on public.payments (student_id, due_on desc);
create index payments_trainer_status_due_idx on public.payments (trainer_id, status, due_on);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  status public.payment_status not null,
  amount_cents integer not null,
  due_on date not null,
  paid_on date,
  actor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index payment_events_payment_created_idx
  on public.payment_events (payment_id, created_at desc);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger payment_events_prevent_update
before update or delete on public.payment_events
for each row execute function public.prevent_appointment_event_mutation();

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

create policy payments_select_involved on public.payments for select to authenticated
using (trainer_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy payment_events_select_involved on public.payment_events for select to authenticated
using (trainer_id = (select auth.uid()) or student_id = (select auth.uid()));

create or replace function public.save_payment(
  target_payment_id uuid,
  target_package_id uuid,
  requested_amount_cents integer,
  requested_due_on date,
  requested_status public.payment_status,
  requested_paid_on date default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_package public.lesson_packages;
  target_payment public.payments;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if target_payment_id is null then raise exception 'PAYMENT_ID_REQUIRED'; end if;
  if requested_amount_cents <= 0 then raise exception 'INVALID_PAYMENT_AMOUNT'; end if;
  if requested_status = 'paid' and requested_paid_on is null then
    raise exception 'PAID_DATE_REQUIRED';
  end if;
  if requested_status <> 'paid' and requested_paid_on is not null then
    raise exception 'PAID_DATE_NOT_ALLOWED';
  end if;

  select * into target_package from public.lesson_packages
  where id = target_package_id;
  if target_package.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;
  if target_package.trainer_id <> auth.uid() then raise exception 'TRAINER_REQUIRED'; end if;

  select * into target_payment from public.payments
  where id = target_payment_id for update;

  if target_payment.id is null then
    insert into public.payments (
      id, trainer_id, student_id, package_id, amount_cents, due_on,
      status, paid_on, created_by
    ) values (
      target_payment_id, target_package.trainer_id, target_package.student_id,
      target_package.id, requested_amount_cents, requested_due_on,
      requested_status, requested_paid_on, auth.uid()
    ) returning * into target_payment;
  else
    if target_payment.trainer_id <> auth.uid() then raise exception 'TRAINER_REQUIRED'; end if;
    if target_payment.package_id <> target_package_id then
      raise exception 'PAYMENT_PACKAGE_CANNOT_CHANGE';
    end if;
    update public.payments set
      amount_cents = requested_amount_cents,
      due_on = requested_due_on,
      status = requested_status,
      paid_on = requested_paid_on
    where id = target_payment.id
    returning * into target_payment;
  end if;

  insert into public.payment_events (
    payment_id, trainer_id, student_id, status, amount_cents,
    due_on, paid_on, actor_id
  ) values (
    target_payment.id, target_payment.trainer_id, target_payment.student_id,
    target_payment.status, target_payment.amount_cents, target_payment.due_on,
    target_payment.paid_on, auth.uid()
  );

  return target_payment;
end;
$$;

revoke all on function public.save_payment(uuid, uuid, integer, date, public.payment_status, date) from public;
grant execute on function public.save_payment(uuid, uuid, integer, date, public.payment_status, date) to authenticated;
grant select on public.payments, public.payment_events to authenticated;
