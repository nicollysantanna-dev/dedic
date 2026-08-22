begin;

do $$
declare
  test_relationship public.trainer_student_relationships;
  test_package public.lesson_packages;
  test_appointment public.appointments;
  completed_appointment public.appointments;
  corrected_appointment public.appointments;
  balance_before integer;
  balance_after integer;
  event_count integer;
begin
  select * into test_relationship
  from public.trainer_student_relationships
  where status = 'active'
  limit 1;

  if test_relationship.id is null then
    raise exception 'TEST_REQUIRES_ACTIVE_RELATIONSHIP';
  end if;

  select * into test_package
  from public.lesson_packages
  where trainer_id = test_relationship.trainer_id
    and student_id = test_relationship.student_id
    and status = 'active'
  limit 1;

  if test_package.id is null then
    raise exception 'TEST_REQUIRES_ACTIVE_PACKAGE';
  end if;

  insert into public.appointments (
    trainer_id,
    student_id,
    relationship_id,
    package_id,
    starts_at,
    ends_at,
    booking_request_id,
    created_by,
    created_at
  ) values (
    test_relationship.trainer_id,
    test_relationship.student_id,
    test_relationship.id,
    test_package.id,
    '2020-01-02 12:00:00+00',
    '2020-01-02 13:00:00+00',
    gen_random_uuid(),
    test_relationship.student_id,
    '2020-01-01 12:00:00+00'
  ) returning * into test_appointment;

  select coalesce(sum(amount), 0)::integer into balance_before
  from public.credit_transactions
  where package_id = test_package.id;

  perform set_config('request.jwt.claim.sub', test_relationship.student_id::text, true);

  begin
    perform public.complete_appointment(test_appointment.id, 'completed');
    raise exception 'STUDENT_COMPLETION_SHOULD_HAVE_FAILED';
  exception
    when others then
      if sqlerrm not like '%TRAINER_REQUIRED%' then
        raise;
      end if;
  end;

  perform set_config('request.jwt.claim.sub', test_relationship.trainer_id::text, true);

  completed_appointment := public.complete_appointment(
    test_appointment.id,
    'completed'
  );

  if completed_appointment.status <> 'completed' then
    raise exception 'COMPLETION_FAILED';
  end if;

  perform public.complete_appointment(test_appointment.id, 'completed');

  select count(*) into event_count
  from public.appointment_events
  where appointment_id = test_appointment.id
    and event_type = 'completed';

  if event_count <> 1 then
    raise exception 'COMPLETION_NOT_IDEMPOTENT';
  end if;

  begin
    perform public.correct_appointment_outcome(
      test_appointment.id,
      'student_no_show',
      'não'
    );
    raise exception 'SHORT_REASON_SHOULD_HAVE_FAILED';
  exception
    when others then
      if sqlerrm not like '%CORRECTION_REASON_REQUIRED%' then
        raise;
      end if;
  end;

  corrected_appointment := public.correct_appointment_outcome(
    test_appointment.id,
    'student_no_show',
    'Aluno informou que não compareceu.'
  );

  if corrected_appointment.status <> 'student_no_show' then
    raise exception 'CORRECTION_FAILED';
  end if;

  if not exists (
    select 1
    from public.appointment_events
    where appointment_id = test_appointment.id
      and event_type = 'student_no_show'
      and details ->> 'correction' = 'true'
      and details ->> 'reason' = 'Aluno informou que não compareceu.'
  ) then
    raise exception 'CORRECTION_AUDIT_MISSING';
  end if;

  select coalesce(sum(amount), 0)::integer into balance_after
  from public.credit_transactions
  where package_id = test_package.id;

  if balance_after <> balance_before then
    raise exception 'OUTCOME_CHANGED_CREDIT_BALANCE';
  end if;
end;
$$;

rollback;
