begin;

do $$
declare
  relationship public.trainer_student_relationships;
  created_appointment public.appointments;
  manual_start timestamptz := date_trunc('hour', now()) + interval '21 days 7 hours';
  balance_before integer;
  balance_after integer;
begin
  select * into relationship from public.trainer_student_relationships
  where status = 'active' limit 1;
  if relationship.id is null then raise exception 'TEST_REQUIRES_ACTIVE_RELATIONSHIP'; end if;

  perform set_config('request.jwt.claim.sub', relationship.trainer_id::text, true);
  balance_before := public.get_credit_balance(relationship.student_id);
  if balance_before < 1 then raise exception 'TEST_REQUIRES_AVAILABLE_CREDIT'; end if;

  delete from public.availability_rules
  where trainer_id = relationship.trainer_id
    and iso_weekday = extract(isodow from manual_start)::smallint;

  created_appointment := public.book_appointment_for_student(
    relationship.student_id, manual_start, gen_random_uuid()
  );

  if created_appointment.created_by <> relationship.trainer_id then
    raise exception 'TRAINER_AUTHORSHIP_MISSING';
  end if;
  if created_appointment.ends_at <= created_appointment.starts_at then
    raise exception 'INVALID_MANUAL_DURATION';
  end if;

  balance_after := public.get_credit_balance(relationship.student_id);
  if balance_after <> balance_before - 1 then
    raise exception 'MANUAL_BOOKING_DID_NOT_CONSUME_ONE_CREDIT';
  end if;
end;
$$;

rollback;
