drop index if exists public.one_active_package_per_student;

create or replace function public.activate_lesson_package(target_package_id uuid)
returns public.lesson_packages
language plpgsql
security definer
set search_path = ''
as $$
declare target_package public.lesson_packages;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target_package from public.lesson_packages
  where id = target_package_id for update;
  if target_package.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;
  if target_package.trainer_id <> auth.uid() then raise exception 'TRAINER_REQUIRED'; end if;
  if target_package.status <> 'draft' then raise exception 'PACKAGE_NOT_DRAFT'; end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = target_package.relationship_id
      and relationship.status = 'active'
  ) then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;

  update public.lesson_packages set status = 'active', activated_at = now()
  where id = target_package.id returning * into target_package;

  insert into public.credit_transactions (
    trainer_id, student_id, package_id, amount, transaction_type, reason, created_by
  ) values (
    target_package.trainer_id, target_package.student_id, target_package.id,
    target_package.lesson_count, 'package_activation', 'Ativação do pacote', auth.uid()
  );
  return target_package;
end;
$$;

create or replace function public.schedule_appointment(
  target_trainer_id uuid,
  target_student_id uuid,
  requested_start timestamptz,
  requested_booking_id uuid
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  existing_appointment public.appointments;
  created_appointment public.appointments;
  active_relationship public.trainer_student_relationships;
  selected_package public.lesson_packages;
  requested_end timestamptz;
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if actor_id <> target_student_id and actor_id <> target_trainer_id then
    raise exception 'PARTICIPANT_REQUIRED';
  end if;
  if requested_booking_id is null then raise exception 'BOOKING_REQUEST_ID_REQUIRED'; end if;

  select * into existing_appointment from public.appointments
  where booking_request_id = requested_booking_id;
  if existing_appointment.id is not null then
    if existing_appointment.student_id <> target_student_id
      or existing_appointment.trainer_id <> target_trainer_id
      or existing_appointment.starts_at <> requested_start then
      raise exception 'BOOKING_REQUEST_REUSED';
    end if;
    return existing_appointment;
  end if;

  select * into active_relationship
  from public.trainer_student_relationships relationship
  where relationship.trainer_id = target_trainer_id
    and relationship.student_id = target_student_id
    and relationship.status = 'active';
  if active_relationship.id is null then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtext(target_student_id::text));

  select package.* into selected_package
  from public.lesson_packages package
  where package.trainer_id = target_trainer_id
    and package.student_id = target_student_id
    and package.status = 'active'
    and (
      select coalesce(sum(transaction.amount), 0)
      from public.credit_transactions transaction
      where transaction.package_id = package.id
    ) > 0
  order by package.activated_at asc
  limit 1
  for update;
  if selected_package.id is null then raise exception 'INSUFFICIENT_CREDITS'; end if;

  select slot.slot_end into requested_end
  from public.get_available_slots(
    target_trainer_id,
    (requested_start at time zone 'America/Sao_Paulo')::date,
    (requested_start at time zone 'America/Sao_Paulo')::date
  ) slot
  where slot.slot_start = requested_start;
  if requested_end is null then raise exception 'SLOT_UNAVAILABLE'; end if;

  insert into public.appointments (
    trainer_id, student_id, relationship_id, package_id, starts_at, ends_at,
    booking_request_id, created_by
  ) values (
    target_trainer_id, target_student_id, active_relationship.id,
    selected_package.id, requested_start, requested_end,
    requested_booking_id, actor_id
  ) returning * into created_appointment;

  insert into public.credit_transactions (
    trainer_id, student_id, package_id, appointment_id, amount,
    transaction_type, reason, created_by
  ) values (
    target_trainer_id, target_student_id, selected_package.id,
    created_appointment.id, -1, 'appointment_consumption',
    case when actor_id = target_trainer_id
      then 'Aula agendada pelo personal'
      else 'Agendamento de aula'
    end,
    actor_id
  );

  insert into public.appointment_events (
    appointment_id, trainer_id, student_id, event_type, actor_id, details
  ) values (
    created_appointment.id, target_trainer_id, target_student_id, 'created', actor_id,
    jsonb_build_object(
      'starts_at', requested_start,
      'ends_at', requested_end,
      'created_by_role', case when actor_id = target_trainer_id then 'trainer' else 'student' end
    )
  );

  return created_appointment;
exception
  when exclusion_violation then raise exception 'SLOT_CONFLICT';
  when unique_violation then
    select * into existing_appointment from public.appointments
    where booking_request_id = requested_booking_id;
    if existing_appointment.id is not null
      and existing_appointment.student_id = target_student_id
      and existing_appointment.trainer_id = target_trainer_id
      and existing_appointment.starts_at = requested_start then
      return existing_appointment;
    end if;
    raise;
end;
$$;

create or replace function public.book_appointment(
  target_trainer_id uuid,
  requested_start timestamptz,
  requested_booking_id uuid
)
returns public.appointments
language sql
security definer
set search_path = ''
as $$
  select public.schedule_appointment(
    target_trainer_id,
    auth.uid(),
    requested_start,
    requested_booking_id
  );
$$;

create or replace function public.book_appointment_for_student(
  target_student_id uuid,
  requested_start timestamptz,
  requested_booking_id uuid
)
returns public.appointments
language sql
security definer
set search_path = ''
as $$
  select public.schedule_appointment(
    auth.uid(),
    target_student_id,
    requested_start,
    requested_booking_id
  );
$$;

create or replace function public.get_credit_balance(target_student_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare balance integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if auth.uid() <> target_student_id and not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  ) then raise exception 'RELATIONSHIP_REQUIRED'; end if;

  select coalesce(sum(transaction.amount), 0)::integer into balance
  from public.credit_transactions transaction
  join public.lesson_packages package on package.id = transaction.package_id
  where transaction.student_id = target_student_id
    and package.status = 'active';
  return balance;
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
  target_package_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
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
  ) then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtext(target_student_id::text));
  current_balance := public.get_credit_balance(target_student_id);
  if current_balance + adjustment_amount < 0 then raise exception 'INSUFFICIENT_CREDITS'; end if;

  select package.id into target_package_id
  from public.lesson_packages package
  where package.student_id = target_student_id and package.status = 'active'
  order by
    case when adjustment_amount < 0 and (
      select coalesce(sum(item.amount), 0) from public.credit_transactions item
      where item.package_id = package.id
    ) > 0 then 0 else 1 end,
    package.activated_at desc
  limit 1;
  if target_package_id is null then raise exception 'ACTIVE_PACKAGE_REQUIRED'; end if;

  insert into public.credit_transactions (
    trainer_id, student_id, package_id, amount, transaction_type, reason, created_by
  ) values (
    auth.uid(), target_student_id, target_package_id, adjustment_amount,
    'manual_adjustment', trim(adjustment_reason), auth.uid()
  ) returning * into transaction;
  return transaction;
end;
$$;

create or replace function public.reschedule_appointment(
  target_appointment_id uuid,
  requested_start timestamptz,
  requested_reschedule_id uuid
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_appointment public.appointments;
  existing_replacement public.appointments;
  new_appointment public.appointments;
  requested_end timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if requested_reschedule_id is null then raise exception 'RESCHEDULE_REQUEST_ID_REQUIRED'; end if;

  select * into existing_replacement from public.appointments appointment
  where appointment.booking_request_id = requested_reschedule_id;
  if existing_replacement.id is not null then
    if existing_replacement.rescheduled_from_id <> target_appointment_id
      or existing_replacement.starts_at <> requested_start then
      raise exception 'RESCHEDULE_REQUEST_REUSED';
    end if;
    return existing_replacement;
  end if;

  select * into original_appointment from public.appointments
  where id = target_appointment_id for update;
  if original_appointment.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if auth.uid() <> original_appointment.student_id
    and auth.uid() <> original_appointment.trainer_id then
    raise exception 'APPOINTMENT_ACCESS_DENIED';
  end if;
  if original_appointment.status <> 'scheduled' then
    raise exception 'APPOINTMENT_CANNOT_BE_RESCHEDULED';
  end if;
  if original_appointment.starts_at <= now() then
    raise exception 'PAST_APPOINTMENT_CANNOT_BE_RESCHEDULED';
  end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.id = original_appointment.relationship_id
      and relationship.status = 'active'
  ) then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;
  if not exists (
    select 1 from public.lesson_packages package
    where package.id = original_appointment.package_id and package.status = 'active'
  ) then raise exception 'ACTIVE_PACKAGE_REQUIRED'; end if;

  select slot.slot_end into requested_end
  from public.get_available_slots(
    original_appointment.trainer_id,
    (requested_start at time zone 'America/Sao_Paulo')::date,
    (requested_start at time zone 'America/Sao_Paulo')::date
  ) slot where slot.slot_start = requested_start;
  if requested_end is null then raise exception 'SLOT_UNAVAILABLE'; end if;

  update public.appointments set status = 'cancelled_for_reschedule', cancelled_at = now()
  where id = original_appointment.id;

  insert into public.appointments (
    trainer_id, student_id, relationship_id, package_id, starts_at, ends_at,
    booking_request_id, created_by, rescheduled_from_id
  ) values (
    original_appointment.trainer_id, original_appointment.student_id,
    original_appointment.relationship_id, original_appointment.package_id,
    requested_start, requested_end, requested_reschedule_id, auth.uid(),
    original_appointment.id
  ) returning * into new_appointment;

  insert into public.appointment_events (
    appointment_id, trainer_id, student_id, event_type, actor_id, details
  ) values
  (
    original_appointment.id, original_appointment.trainer_id,
    original_appointment.student_id, 'rescheduled', auth.uid(),
    jsonb_build_object('replacement_appointment_id', new_appointment.id)
  ),
  (
    new_appointment.id, new_appointment.trainer_id, new_appointment.student_id,
    'created', auth.uid(), jsonb_build_object(
      'starts_at', requested_start,
      'ends_at', requested_end,
      'rescheduled_from_id', original_appointment.id
    )
  );
  return new_appointment;
exception
  when exclusion_violation then raise exception 'SLOT_CONFLICT';
  when unique_violation then
    select * into existing_replacement from public.appointments appointment
    where appointment.booking_request_id = requested_reschedule_id;
    if existing_replacement.id is not null
      and existing_replacement.rescheduled_from_id = target_appointment_id
      and existing_replacement.starts_at = requested_start then
      return existing_replacement;
    end if;
    raise;
end;
$$;

revoke all on function public.schedule_appointment(uuid, uuid, timestamptz, uuid) from public, authenticated;
revoke all on function public.book_appointment(uuid, timestamptz, uuid) from public;
revoke all on function public.book_appointment_for_student(uuid, timestamptz, uuid) from public;
grant execute on function public.book_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.book_appointment_for_student(uuid, timestamptz, uuid) to authenticated;
