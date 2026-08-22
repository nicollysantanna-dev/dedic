create or replace function public.complete_appointment(
  target_appointment_id uuid,
  requested_outcome public.appointment_status
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_appointment public.appointments;
  outcome_event public.appointment_event_type;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if requested_outcome not in ('completed', 'student_no_show') then
    raise exception 'INVALID_APPOINTMENT_OUTCOME';
  end if;

  select * into target_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if target_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if target_appointment.trainer_id <> auth.uid() then
    raise exception 'TRAINER_REQUIRED';
  end if;

  if target_appointment.status = requested_outcome then
    return target_appointment;
  end if;

  if target_appointment.status <> 'scheduled' then
    raise exception 'APPOINTMENT_OUTCOME_REQUIRES_CORRECTION';
  end if;

  if target_appointment.starts_at > now() then
    raise exception 'APPOINTMENT_NOT_STARTED';
  end if;

  update public.appointments
  set status = requested_outcome
  where id = target_appointment.id
  returning * into target_appointment;

  outcome_event := case
    when requested_outcome = 'completed'
      then 'completed'::public.appointment_event_type
    else 'student_no_show'::public.appointment_event_type
  end;

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
    outcome_event,
    auth.uid(),
    jsonb_build_object('status', requested_outcome)
  );

  return target_appointment;
end;
$$;

create or replace function public.correct_appointment_outcome(
  target_appointment_id uuid,
  requested_outcome public.appointment_status,
  correction_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_appointment public.appointments;
  previous_outcome public.appointment_status;
  outcome_event public.appointment_event_type;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if requested_outcome not in ('completed', 'student_no_show') then
    raise exception 'INVALID_APPOINTMENT_OUTCOME';
  end if;

  if correction_reason is null or char_length(trim(correction_reason)) < 5 then
    raise exception 'CORRECTION_REASON_REQUIRED';
  end if;

  select * into target_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if target_appointment.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if target_appointment.trainer_id <> auth.uid() then
    raise exception 'TRAINER_REQUIRED';
  end if;

  if target_appointment.status not in ('completed', 'student_no_show') then
    raise exception 'APPOINTMENT_NOT_COMPLETED';
  end if;

  if target_appointment.status = requested_outcome then
    raise exception 'OUTCOME_UNCHANGED';
  end if;

  previous_outcome := target_appointment.status;

  update public.appointments
  set status = requested_outcome
  where id = target_appointment.id
  returning * into target_appointment;

  outcome_event := case
    when requested_outcome = 'completed'
      then 'completed'::public.appointment_event_type
    else 'student_no_show'::public.appointment_event_type
  end;

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
    outcome_event,
    auth.uid(),
    jsonb_build_object(
      'status', requested_outcome,
      'previous_status', previous_outcome,
      'correction', true,
      'reason', trim(correction_reason)
    )
  );

  return target_appointment;
end;
$$;

revoke all on function public.complete_appointment(uuid, public.appointment_status) from public;
revoke all on function public.correct_appointment_outcome(uuid, public.appointment_status, text) from public;
grant execute on function public.complete_appointment(uuid, public.appointment_status) to authenticated;
grant execute on function public.correct_appointment_outcome(uuid, public.appointment_status, text) to authenticated;
