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
  lesson_duration integer;
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if actor_id <> target_student_id and actor_id <> target_trainer_id then
    raise exception 'PARTICIPANT_REQUIRED';
  end if;
  if requested_booking_id is null then raise exception 'BOOKING_REQUEST_ID_REQUIRED'; end if;
  if requested_start <= now() then raise exception 'PAST_APPOINTMENT_NOT_ALLOWED'; end if;

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

  if actor_id = target_trainer_id then
    select profile.default_lesson_duration_minutes into lesson_duration
    from public.profiles profile
    where profile.id = target_trainer_id and profile.role = 'trainer';
    if lesson_duration is null then raise exception 'TRAINER_DURATION_REQUIRED'; end if;
    requested_end := requested_start + make_interval(mins => lesson_duration);

    if exists (
      select 1 from public.availability_exceptions exception
      where exception.trainer_id = target_trainer_id
        and tstzrange(exception.starts_at, exception.ends_at, '[)')
          && tstzrange(requested_start, requested_end, '[)')
    ) then raise exception 'BLOCKED_PERIOD_CONFLICT'; end if;
  else
    select slot.slot_end into requested_end
    from public.get_available_slots(
      target_trainer_id,
      (requested_start at time zone 'America/Sao_Paulo')::date,
      (requested_start at time zone 'America/Sao_Paulo')::date
    ) slot
    where slot.slot_start = requested_start;
    if requested_end is null then raise exception 'SLOT_UNAVAILABLE'; end if;
  end if;

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
      then 'Aula agendada manualmente pelo personal'
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
      'created_by_role', case when actor_id = target_trainer_id then 'trainer' else 'student' end,
      'manual_booking', actor_id = target_trainer_id
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

revoke all on function public.schedule_appointment(uuid, uuid, timestamptz, uuid)
  from public, authenticated;
