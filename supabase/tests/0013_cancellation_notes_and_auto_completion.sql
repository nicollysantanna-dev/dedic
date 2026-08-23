begin;

do $$
declare
  relationship public.trainer_student_relationships;
  target_appointment public.appointments;
  cancellation_event public.appointment_events;
  elapsed_appointment public.appointments;
  finalized_count integer;
begin
  select * into relationship from public.trainer_student_relationships
  where status = 'active' limit 1;
  if relationship.id is null then raise exception 'TEST_REQUIRES_ACTIVE_RELATIONSHIP'; end if;

  select * into target_appointment from public.appointments
  where trainer_id = relationship.trainer_id
    and student_id = relationship.student_id
    and status = 'scheduled'
    and starts_at > now()
  limit 1;

  if target_appointment.id is not null then
    perform set_config('request.jwt.claim.sub', relationship.trainer_id::text, true);
    perform public.cancel_appointment(target_appointment.id, 'Compromisso profissional');
    select * into cancellation_event from public.appointment_events
    where appointment_id = target_appointment.id and event_type = 'cancelled'
    order by created_at desc limit 1;
    if cancellation_event.details ->> 'reason' <> 'Compromisso profissional' then
      raise exception 'CANCELLATION_REASON_NOT_RECORDED';
    end if;
  end if;

  select * into elapsed_appointment from public.appointments
  where status = 'scheduled' limit 1;
  if elapsed_appointment.id is not null then
    update public.appointments
    set starts_at = '2000-01-01 10:00:00+00', ends_at = '2000-01-01 11:00:00+00'
    where id = elapsed_appointment.id;
    finalized_count := public.finalize_elapsed_appointments();
    if finalized_count < 1 then raise exception 'ELAPSED_APPOINTMENT_NOT_FINALIZED'; end if;
    if (select status from public.appointments where id = elapsed_appointment.id) <> 'completed' then
      raise exception 'ELAPSED_APPOINTMENT_WRONG_STATUS';
    end if;
    if public.finalize_elapsed_appointments() <> 0 then
      raise exception 'AUTO_COMPLETION_NOT_IDEMPOTENT';
    end if;
  end if;
end;
$$;

rollback;
