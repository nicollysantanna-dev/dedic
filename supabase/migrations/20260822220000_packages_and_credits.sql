create type public.package_status as enum (
  'draft',
  'active',
  'exhausted',
  'expired',
  'cancelled'
);

create type public.credit_transaction_type as enum (
  'package_activation',
  'package_cancellation',
  'appointment_consumption',
  'cancellation_refund',
  'manual_adjustment'
);

alter table public.trainer_student_relationships
add constraint relationship_id_parties_unique unique (id, trainer_id, student_id);

create table public.lesson_packages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  relationship_id uuid not null references public.trainer_student_relationships (id),
  lesson_count smallint not null check (lesson_count between 1 and 100),
  price_cents integer not null check (price_cents >= 0),
  starts_on date not null,
  expires_on date not null,
  status public.package_status not null default 'draft',
  activated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_package_date_order check (expires_on >= starts_on),
  constraint lesson_package_relationship_parties foreign key (
    relationship_id,
    trainer_id,
    student_id
  ) references public.trainer_student_relationships (id, trainer_id, student_id)
);

create unique index one_active_package_per_student
  on public.lesson_packages (student_id)
  where status = 'active';

create index lesson_packages_parties_status_idx
  on public.lesson_packages (trainer_id, student_id, status);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  package_id uuid references public.lesson_packages (id),
  appointment_id uuid,
  amount smallint not null check (amount <> 0),
  transaction_type public.credit_transaction_type not null,
  reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint manual_adjustment_reason_required check (
    transaction_type <> 'manual_adjustment'
    or char_length(trim(reason)) between 4 and 240
  ),
  constraint package_activation_reference_required check (
    transaction_type <> 'package_activation' or package_id is not null
  )
);

create unique index one_activation_per_package
  on public.credit_transactions (package_id)
  where transaction_type = 'package_activation';

create index credit_transactions_student_created_idx
  on public.credit_transactions (student_id, created_at desc);

create trigger lesson_packages_set_updated_at
before update on public.lesson_packages
for each row execute function public.set_updated_at();

create or replace function public.prevent_credit_transaction_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'CREDIT_TRANSACTIONS_ARE_IMMUTABLE';
end;
$$;

create trigger credit_transactions_prevent_update
before update or delete on public.credit_transactions
for each row execute function public.prevent_credit_transaction_mutation();

alter table public.lesson_packages enable row level security;
alter table public.credit_transactions enable row level security;

create policy lesson_packages_select_involved
on public.lesson_packages for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or student_id = (select auth.uid())
);

create policy lesson_packages_trainer_insert_draft
on public.lesson_packages for insert
to authenticated
with check (
  trainer_id = (select auth.uid())
  and status = 'draft'
  and activated_at is null
  and cancelled_at is null
  and exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.id = relationship_id
      and relationship.trainer_id = (select auth.uid())
      and relationship.student_id = lesson_packages.student_id
      and relationship.status = 'active'
  )
);

create or replace function public.activate_lesson_package(target_package_id uuid)
returns public.lesson_packages
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_package public.lesson_packages;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target_package
  from public.lesson_packages
  where id = target_package_id
  for update;

  if target_package.id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if target_package.trainer_id <> auth.uid() then
    raise exception 'TRAINER_REQUIRED';
  end if;

  if target_package.status <> 'draft' then
    raise exception 'PACKAGE_NOT_DRAFT';
  end if;

  if target_package.expires_on < current_date then
    raise exception 'PACKAGE_ALREADY_EXPIRED';
  end if;

  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target_package.relationship_id
      and relationship.status = 'active'
  ) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  if exists (
    select 1 from public.lesson_packages package
    where package.student_id = target_package.student_id
      and package.status = 'active'
  ) then
    raise exception 'ACTIVE_PACKAGE_ALREADY_EXISTS';
  end if;

  update public.lesson_packages
  set status = 'active', activated_at = now()
  where id = target_package.id
  returning * into target_package;

  insert into public.credit_transactions (
    trainer_id,
    student_id,
    package_id,
    amount,
    transaction_type,
    reason,
    created_by
  ) values (
    target_package.trainer_id,
    target_package.student_id,
    target_package.id,
    target_package.lesson_count,
    'package_activation',
    'Ativação do pacote',
    auth.uid()
  );

  return target_package;
end;
$$;

create or replace function public.adjust_student_credits(
  target_student_id uuid,
  adjustment_amount smallint,
  adjustment_reason text
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  transaction public.credit_transactions;
  current_balance integer;
  active_package_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if adjustment_amount = 0 or adjustment_amount < -100 or adjustment_amount > 100 then
    raise exception 'INVALID_ADJUSTMENT_AMOUNT';
  end if;

  if char_length(trim(adjustment_reason)) < 4
    or char_length(trim(adjustment_reason)) > 240 then
    raise exception 'ADJUSTMENT_REASON_REQUIRED';
  end if;

  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  ) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_student_id::text));

  select id into active_package_id
  from public.lesson_packages
  where student_id = target_student_id
    and status = 'active'
    and starts_on <= current_date
    and expires_on >= current_date
  order by activated_at desc
  limit 1;

  if active_package_id is null then
    raise exception 'ACTIVE_PACKAGE_REQUIRED';
  end if;

  select coalesce(sum(amount), 0)::integer into current_balance
  from public.credit_transactions
  where package_id = active_package_id;

  if current_balance + adjustment_amount < 0 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_transactions (
    trainer_id,
    student_id,
    package_id,
    amount,
    transaction_type,
    reason,
    created_by
  ) values (
    auth.uid(),
    target_student_id,
    active_package_id,
    adjustment_amount,
    'manual_adjustment',
    trim(adjustment_reason),
    auth.uid()
  )
  returning * into transaction;

  return transaction;
end;
$$;

create or replace function public.cancel_lesson_package(target_package_id uuid)
returns public.lesson_packages
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_package public.lesson_packages;
  package_balance integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target_package
  from public.lesson_packages
  where id = target_package_id
  for update;

  if target_package.id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if target_package.trainer_id <> auth.uid() then
    raise exception 'TRAINER_REQUIRED';
  end if;

  if target_package.status not in ('draft', 'active') then
    raise exception 'PACKAGE_CANNOT_BE_CANCELLED';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_package.student_id::text));

  select coalesce(sum(amount), 0)::integer into package_balance
  from public.credit_transactions
  where package_id = target_package.id;

  update public.lesson_packages
  set status = 'cancelled', cancelled_at = now()
  where id = target_package.id
  returning * into target_package;

  if package_balance > 0 then
    insert into public.credit_transactions (
      trainer_id,
      student_id,
      package_id,
      amount,
      transaction_type,
      reason,
      created_by
    ) values (
      target_package.trainer_id,
      target_package.student_id,
      target_package.id,
      -package_balance,
      'package_cancellation',
      'Cancelamento do pacote',
      auth.uid()
    );
  end if;

  return target_package;
end;
$$;

create or replace function public.get_credit_balance(target_student_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  balance integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if auth.uid() <> target_student_id and not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  ) then
    raise exception 'RELATIONSHIP_REQUIRED';
  end if;

  select coalesce(sum(transaction.amount), 0)::integer into balance
  from public.credit_transactions transaction
  join public.lesson_packages package on package.id = transaction.package_id
  where transaction.student_id = target_student_id
    and package.status = 'active'
    and package.starts_on <= current_date
    and package.expires_on >= current_date;

  return balance;
end;
$$;

create policy credit_transactions_select_involved
on public.credit_transactions for select
to authenticated
using (
  student_id = (select auth.uid())
  or trainer_id = (select auth.uid())
);

revoke all on function public.activate_lesson_package(uuid) from public;
revoke all on function public.adjust_student_credits(uuid, smallint, text) from public;
revoke all on function public.cancel_lesson_package(uuid) from public;
revoke all on function public.get_credit_balance(uuid) from public;
grant execute on function public.activate_lesson_package(uuid) to authenticated;
grant execute on function public.adjust_student_credits(uuid, smallint, text) to authenticated;
grant execute on function public.cancel_lesson_package(uuid) to authenticated;
grant execute on function public.get_credit_balance(uuid) to authenticated;

grant select, insert on public.lesson_packages to authenticated;
grant select on public.credit_transactions to authenticated;
