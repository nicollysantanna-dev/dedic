alter table public.appointments
add column rescheduled_from_id uuid references public.appointments (id);

create unique index one_replacement_per_appointment
  on public.appointments (rescheduled_from_id)
  where rescheduled_from_id is not null;

create unique index one_cancellation_refund_per_appointment
  on public.credit_transactions (appointment_id)
  where transaction_type = 'cancellation_refund';

create or replace function public.cancel_appointment(target_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_appointment public.appointments;
  cancellation_status public.appointment_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if target_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if auth.uid() <> target_appointment.student_id
    and auth.uid() <> target_appointment.trainer_id then
    raise exception 'APPOINTMENT_ACCESS_DENIED';
  end if;

  if target_appointment.status in ('cancelled_by_student', 'cancelled_by_trainer') then
    return target_appointment;
  end if;

  if target_appointment.status <> 'scheduled' then
    raise exception 'APPOINTMENT_CANNOT_BE_CANCELLED';
  end if;

  if target_appointment.starts_at <= now() then
    raise exception 'PAST_APPOINTMENT_CANNOT_BE_CANCELLED';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_appointment.student_id::text));

  cancellation_status := case
    when auth.uid() = target_appointment.student_id
      then 'cancelled_by_student'::public.appointment_status
    else 'cancelled_by_trainer'::public.appointment_status
  end;

  update public.appointments
  set status = cancellation_status, cancelled_at = now()
  where id = target_appointment.id
  returning * into target_appointment;

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
    target_appointment.trainer_id,
    target_appointment.student_id,
    target_appointment.package_id,
    target_appointment.id,
    1,
    'cancellation_refund',
    'Devolução por cancelamento',
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
    target_appointment.id,
    target_appointment.trainer_id,
    target_appointment.student_id,
    'cancelled',
    auth.uid(),
    jsonb_build_object('status', cancellation_status)
  );

  return target_appointment;
exception
  when unique_violation then
    select * into target_appointment
    from public.appointments
    where id = target_appointment_id;
    return target_appointment;
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
  actor_is_involved boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if requested_reschedule_id is null then
    raise exception 'RESCHEDULE_REQUEST_ID_REQUIRED';
  end if;

  select * into existing_replacement
  from public.appointments appointment
  where appointment.booking_request_id = requested_reschedule_id;

  if existing_replacement.id is not null then
    if existing_replacement.rescheduled_from_id <> target_appointment_id
      or existing_replacement.starts_at <> requested_start
      or (
        existing_replacement.student_id <> auth.uid()
        and existing_replacement.trainer_id <> auth.uid()
      ) then
      raise exception 'RESCHEDULE_REQUEST_REUSED';
    end if;
    return existing_replacement;
  end if;

  select * into original_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if original_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  actor_is_involved := auth.uid() = original_appointment.student_id
    or auth.uid() = original_appointment.trainer_id;

  if not actor_is_involved then
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
  ) then
    raise exception 'ACTIVE_RELATIONSHIP_REQUIRED';
  end if;

  if not exists (
    select 1 from public.lesson_packages package
    where package.id = original_appointment.package_id
      and package.status = 'active'
      and package.starts_on <= (requested_start at time zone 'America/Sao_Paulo')::date
      and package.expires_on >= (requested_start at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'PACKAGE_INVALID_FOR_NEW_DATE';
  end if;

  select slot.slot_end into requested_end
  from public.get_available_slots(
    original_appointment.trainer_id,
    (requested_start at time zone 'America/Sao_Paulo')::date,
    (requested_start at time zone 'America/Sao_Paulo')::date
  ) slot
  where slot.slot_start = requested_start;

  if requested_end is null then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  update public.appointments
  set status = 'cancelled_for_reschedule', cancelled_at = now()
  where id = original_appointment.id;

  insert into public.appointments (
    trainer_id,
    student_id,
    relationship_id,
    package_id,
    starts_at,
    ends_at,
    booking_request_id,
    created_by,
    rescheduled_from_id
  ) values (
    original_appointment.trainer_id,
    original_appointment.student_id,
    original_appointment.relationship_id,
    original_appointment.package_id,
    requested_start,
    requested_end,
    requested_reschedule_id,
    auth.uid(),
    original_appointment.id
  )
  returning * into new_appointment;

  insert into public.appointment_events (
    appointment_id,
    trainer_id,
    student_id,
    event_type,
    actor_id,
    details
  ) values
  (
    original_appointment.id,
    original_appointment.trainer_id,
    original_appointment.student_id,
    'rescheduled',
    auth.uid(),
    jsonb_build_object('new_appointment_id', new_appointment.id)
  ),
  (
    new_appointment.id,
    new_appointment.trainer_id,
    new_appointment.student_id,
    'created',
    auth.uid(),
    jsonb_build_object(
      'rescheduled_from_id', original_appointment.id,
      'starts_at', requested_start,
      'ends_at', requested_end
    )
  );

  return new_appointment;
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT';
  when unique_violation then
    select * into existing_replacement
    from public.appointments appointment
    where appointment.booking_request_id = requested_reschedule_id;
    if existing_replacement.id is not null
      and existing_replacement.rescheduled_from_id = target_appointment_id
      and existing_replacement.starts_at = requested_start then
      return existing_replacement;
    end if;
    raise;
end;
$$;

revoke all on function public.cancel_appointment(uuid) from public;
revoke all on function public.reschedule_appointment(uuid, timestamptz, uuid) from public;
grant execute on function public.cancel_appointment(uuid) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid) to authenticated;
