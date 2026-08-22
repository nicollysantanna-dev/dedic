create extension if not exists btree_gist with schema extensions;

create type public.appointment_status as enum (
  'scheduled',
  'completed',
  'cancelled_by_student',
  'cancelled_by_trainer',
  'cancelled_for_reschedule',
  'student_no_show'
);

create type public.appointment_event_type as enum (
  'created',
  'cancelled',
  'rescheduled',
  'completed',
  'student_no_show'
);

alter table public.lesson_packages
add constraint lesson_package_id_parties_unique unique (id, trainer_id, student_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  relationship_id uuid not null,
  package_id uuid not null references public.lesson_packages (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  booking_request_id uuid not null unique,
  created_by uuid not null references public.profiles (id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_order check (starts_at < ends_at),
  constraint appointment_future_when_scheduled check (
    status <> 'scheduled' or starts_at > created_at
  ),
  constraint appointment_relationship_parties foreign key (
    relationship_id,
    trainer_id,
    student_id
  ) references public.trainer_student_relationships (id, trainer_id, student_id),
  constraint appointment_package_parties foreign key (
    package_id,
    trainer_id,
    student_id
  ) references public.lesson_packages (id, trainer_id, student_id)
);

alter table public.credit_transactions
add constraint credit_transactions_appointment_id_fkey
foreign key (appointment_id) references public.appointments (id);

alter table public.appointments
add constraint appointments_trainer_no_overlap
exclude using gist (
  trainer_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status = 'scheduled');

alter table public.appointments
add constraint appointments_student_no_overlap
exclude using gist (
  student_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status = 'scheduled');

create index appointments_trainer_start_idx
  on public.appointments (trainer_id, starts_at)
  where status = 'scheduled';

create index appointments_student_start_idx
  on public.appointments (student_id, starts_at)
  where status = 'scheduled';

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  event_type public.appointment_event_type not null,
  actor_id uuid not null references public.profiles (id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointment_events_appointment_created_idx
  on public.appointment_events (appointment_id, created_at);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create or replace function public.prevent_appointment_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'APPOINTMENT_EVENTS_ARE_IMMUTABLE';
end;
$$;

create trigger appointment_events_prevent_update
before update or delete on public.appointment_events
for each row execute function public.prevent_appointment_event_mutation();

alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;

create policy appointments_select_involved
on public.appointments for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or student_id = (select auth.uid())
);

create policy appointment_events_select_involved
on public.appointment_events for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or student_id = (select auth.uid())
);

create or replace function public.get_available_slots(
  target_trainer_id uuid,
  range_start date,
  range_end date
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lesson_duration_minutes integer;
  trainer_timezone text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if range_end < range_start or range_end > range_start + 31 then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  if auth.uid() <> target_trainer_id and not exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.trainer_id = target_trainer_id
      and relationship.student_id = auth.uid()
      and relationship.status = 'active'
  ) then
    raise exception 'RELATIONSHIP_REQUIRED';
  end if;

  select
    profile.default_lesson_duration_minutes,
    profile.timezone
  into lesson_duration_minutes, trainer_timezone
  from public.profiles profile
  where profile.id = target_trainer_id
    and profile.role = 'trainer';

  if lesson_duration_minutes is null then
    raise exception 'TRAINER_NOT_FOUND';
  end if;

  return query
  with calendar_days as (
    select generated_day::date as local_day
    from generate_series(range_start, range_end, interval '1 day') generated_day
  ),
  generated_slots as (
    select
      local_slot at time zone trainer_timezone as generated_start,
      (local_slot + make_interval(mins => lesson_duration_minutes))
        at time zone trainer_timezone as generated_end
    from calendar_days day
    join public.availability_rules rule
      on rule.trainer_id = target_trainer_id
      and rule.active = true
      and rule.iso_weekday = extract(isodow from day.local_day)::smallint
      and rule.valid_from <= day.local_day
      and (rule.valid_until is null or rule.valid_until >= day.local_day)
    cross join lateral generate_series(
      day.local_day + rule.start_time,
      day.local_day + rule.end_time - make_interval(mins => lesson_duration_minutes),
      make_interval(mins => lesson_duration_minutes)
    ) local_slot
  )
  select distinct generated.generated_start, generated.generated_end
  from generated_slots generated
  where generated.generated_start > now()
    and not exists (
      select 1
      from public.availability_exceptions exception
      where exception.trainer_id = target_trainer_id
        and tstzrange(exception.starts_at, exception.ends_at, '[)')
          && tstzrange(generated.generated_start, generated.generated_end, '[)')
    )
    and not exists (
      select 1
      from public.appointments appointment
      where appointment.trainer_id = target_trainer_id
        and appointment.status = 'scheduled'
        and tstzrange(appointment.starts_at, appointment.ends_at, '[)')
          && tstzrange(generated.generated_start, generated.generated_end, '[)')
    )
  order by generated.generated_start;
end;
$$;

create or replace function public.book_appointment(
  target_trainer_id uuid,
  requested_start timestamptz,
  requested_booking_id uuid
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_appointment public.appointments;
  created_appointment public.appointments;
  active_relationship public.trainer_student_relationships;
  active_package public.lesson_packages;
  requested_end timestamptz;
  available_balance integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if requested_booking_id is null then
    raise exception 'BOOKING_REQUEST_ID_REQUIRED';
  end if;

  select * into existing_appointment
  from public.appointments appointment
  where appointment.booking_request_id = requested_booking_id;

  if existing_appointment.id is not null then
    if existing_appointment.student_id <> auth.uid()
      or existing_appointment.trainer_id <> target_trainer_id
      or existing_appointment.starts_at <> requested_start then
      raise exception 'BOOKING_REQUEST_REUSED';
    end if;
    return existing_appointment;
  end if;

  select * into active_relationship
  from public.trainer_student_relationships relationship
  where relationship.trainer_id = target_trainer_id
    and relationship.student_id = auth.uid()
    and relationship.status = 'active';

  if active_relationship.id is null then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select * into active_package
  from public.lesson_packages package
  where package.trainer_id = target_trainer_id
    and package.student_id = auth.uid()
    and package.status = 'active'
    and package.starts_on <= (requested_start at time zone 'America/Sao_Paulo')::date
    and package.expires_on >= (requested_start at time zone 'America/Sao_Paulo')::date
  order by package.activated_at desc
  limit 1
  for update;

  if active_package.id is null then
    raise exception 'ACTIVE_PACKAGE_REQUIRED';
  end if;

  select coalesce(sum(amount), 0)::integer into available_balance
  from public.credit_transactions transaction
  where transaction.package_id = active_package.id;

  if available_balance < 1 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  select slot.slot_end into requested_end
  from public.get_available_slots(
    target_trainer_id,
    (requested_start at time zone 'America/Sao_Paulo')::date,
    (requested_start at time zone 'America/Sao_Paulo')::date
  ) slot
  where slot.slot_start = requested_start;

  if requested_end is null then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  insert into public.appointments (
    trainer_id,
    student_id,
    relationship_id,
    package_id,
    starts_at,
    ends_at,
    booking_request_id,
    created_by
  ) values (
    target_trainer_id,
    auth.uid(),
    active_relationship.id,
    active_package.id,
    requested_start,
    requested_end,
    requested_booking_id,
    auth.uid()
  )
  returning * into created_appointment;

  insert into public.credit_transactions (
    trainer_id,
    student_id,
    package_id,
    appointment_id,
    amount,
    transaction_type,
    reason,
    created_by
  ) values (
    target_trainer_id,
    auth.uid(),
    active_package.id,
    created_appointment.id,
    -1,
    'appointment_consumption',
    'Agendamento de aula',
    auth.uid()
  );

  insert into public.appointment_events (
    appointment_id,
    trainer_id,
    student_id,
    event_type,
    actor_id,
    details
  ) values (
    created_appointment.id,
    target_trainer_id,
    auth.uid(),
    'created',
    auth.uid(),
    jsonb_build_object('starts_at', requested_start, 'ends_at', requested_end)
  );

  return created_appointment;
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT';
  when unique_violation then
    select * into existing_appointment
    from public.appointments appointment
    where appointment.booking_request_id = requested_booking_id;
    if existing_appointment.id is not null
      and existing_appointment.student_id = auth.uid()
      and existing_appointment.trainer_id = target_trainer_id
      and existing_appointment.starts_at = requested_start then
      return existing_appointment;
    end if;
    raise;
end;
$$;

revoke all on function public.book_appointment(uuid, timestamptz, uuid) from public;
grant execute on function public.book_appointment(uuid, timestamptz, uuid) to authenticated;

grant select on public.appointments to authenticated;
grant select on public.appointment_events to authenticated;
