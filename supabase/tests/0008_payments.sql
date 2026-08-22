begin;

do $$
declare
  test_package public.lesson_packages;
  test_payment public.payments;
  test_payment_id uuid := gen_random_uuid();
  balance_before integer;
  balance_after integer;
  event_count integer;
begin
  select * into test_package
  from public.lesson_packages
  where status = 'active'
  limit 1;

  if test_package.id is null then raise exception 'TEST_REQUIRES_ACTIVE_PACKAGE'; end if;

  select coalesce(sum(amount), 0)::integer into balance_before
  from public.credit_transactions where package_id = test_package.id;

  perform set_config('request.jwt.claim.sub', test_package.trainer_id::text, true);

  test_payment := public.save_payment(
    test_payment_id, test_package.id, 50000, current_date + 5, 'pending', null
  );
  if test_payment.status <> 'pending' then raise exception 'PAYMENT_CREATE_FAILED'; end if;

  test_payment := public.save_payment(
    test_payment_id, test_package.id, 50000, current_date + 5, 'paid', current_date
  );
  if test_payment.status <> 'paid' or test_payment.paid_on <> current_date then
    raise exception 'PAYMENT_UPDATE_FAILED';
  end if;

  select count(*) into event_count from public.payment_events
  where payment_events.payment_id = test_payment_id;
  if event_count <> 2 then raise exception 'PAYMENT_HISTORY_MISSING'; end if;

  select coalesce(sum(amount), 0)::integer into balance_after
  from public.credit_transactions where package_id = test_package.id;
  if balance_after <> balance_before then raise exception 'PAYMENT_CHANGED_CREDITS'; end if;

  perform set_config('request.jwt.claim.sub', test_package.student_id::text, true);
  begin
    perform public.save_payment(
      test_payment_id, test_package.id, 50000, current_date + 5, 'cancelled', null
    );
    raise exception 'STUDENT_UPDATE_SHOULD_FAIL';
  exception when others then
    if sqlerrm not like '%TRAINER_REQUIRED%' then raise; end if;
  end;
end;
$$;

rollback;
