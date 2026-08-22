begin;

do $$
declare
  relationship public.trainer_student_relationships;
  old_package public.lesson_packages;
  added_package public.lesson_packages;
  created_appointment public.appointments;
  selected_slot timestamptz;
  balance_before integer;
  balance_after_activation integer;
  balance_after_booking integer;
  test_day date := current_date + 20;
begin
  select * into relationship from public.trainer_student_relationships
  where status = 'active' limit 1;
  select * into old_package from public.lesson_packages
  where trainer_id = relationship.trainer_id
    and student_id = relationship.student_id
    and status = 'active'
  order by activated_at limit 1;
  if old_package.id is null then raise exception 'TEST_REQUIRES_ACTIVE_PACKAGE'; end if;

  update public.lesson_packages
  set starts_on = '2020-01-01', expires_on = '2020-02-01'
  where id = old_package.id;

  perform set_config('request.jwt.claim.sub', relationship.trainer_id::text, true);
  balance_before := public.get_credit_balance(relationship.student_id);

  insert into public.lesson_packages (
    trainer_id, student_id, relationship_id, lesson_count, price_cents,
    starts_on, expires_on
  ) values (
    relationship.trainer_id, relationship.student_id, relationship.id,
    2, 10000, current_date, current_date + 30
  ) returning * into added_package;
  perform public.activate_lesson_package(added_package.id);

  balance_after_activation := public.get_credit_balance(relationship.student_id);
  if balance_after_activation <> balance_before + 2 then
    raise exception 'CREDITS_DID_NOT_ACCUMULATE';
  end if;

  insert into public.availability_rules (
    trainer_id, iso_weekday, start_time, end_time, valid_from, valid_until
  ) values (
    relationship.trainer_id, extract(isodow from test_day)::smallint,
    '03:00', '05:00', test_day, test_day
  );

  select slot_start into selected_slot
  from public.get_available_slots(
    relationship.trainer_id, test_day, test_day
  ) limit 1;
  if selected_slot is null then raise exception 'TEST_REQUIRES_AVAILABLE_SLOT'; end if;

  created_appointment := public.book_appointment_for_student(
    relationship.student_id, selected_slot, gen_random_uuid()
  );
  if created_appointment.created_by <> relationship.trainer_id then
    raise exception 'TRAINER_AUTHORSHIP_MISSING';
  end if;
  if created_appointment.package_id <> old_package.id then
    raise exception 'OLDEST_CREDIT_NOT_USED_FIRST';
  end if;

  balance_after_booking := public.get_credit_balance(relationship.student_id);
  if balance_after_booking <> balance_after_activation - 1 then
    raise exception 'BOOKING_DID_NOT_CONSUME_ONE_CREDIT';
  end if;
end;
$$;

rollback;
