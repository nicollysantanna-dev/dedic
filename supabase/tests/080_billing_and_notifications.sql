-- Aula avulsa, pacote atômico com cobrança, atraso automático e notificações.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_a;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Pacote atômico: ativa e gera cobrança pendente.
select pg_temp.login((select trainer_id from ctx));
create temporary table created as
select (public.create_lesson_package(
  (select ana_id from ctx), 'package', 4::smallint, 40000, current_date, current_date + 60
)).id as package_id;
select is(
  (select status from public.lesson_packages where id = (select package_id from created)),
  'active',
  'pacote criado já ativo'
);
select is(public.get_credit_balance((select ana_id from ctx)), 14, 'créditos do pacote entram no saldo');
select is(
  (select count(*) from public.payments where package_id = (select package_id from created) and status = 'pending'),
  1::bigint,
  'cobrança pendente gerada junto com o pacote'
);

-- Aula avulsa: sempre 1 crédito; opção de aguardar pagamento.
create temporary table single as
select (public.create_lesson_package(
  (select ana_id from ctx), 'single', 5::smallint, 15000, current_date, current_date + 30, false, true
)).id as package_id;
select is(
  (select lesson_count from public.lesson_packages where id = (select package_id from single)),
  1::smallint,
  'aula avulsa tem exatamente um crédito'
);
select is(
  (select status from public.lesson_packages where id = (select package_id from single)),
  'draft',
  'avulsa aguardando pagamento fica em rascunho'
);
select is(public.get_credit_balance((select ana_id from ctx)), 14, 'rascunho não entra no saldo');

select throws_like(
  $$ select public.create_lesson_package(
       (select carla_id from ctx), 'package', 4::smallint, 40000, current_date, current_date + 60) $$,
  '%ACTIVE_RELATIONSHIP_REQUIRED%',
  'sem vínculo não há pacote'
);

-- Atraso automático: cobrança vencida vira overdue com evento e notificação.
update public.payments set due_on = public.local_today() - 1
where package_id = (select package_id from created);
select is(public.mark_overdue_payments(), 1, 'cron marca a cobrança vencida');
select is(
  (select status from public.payments where package_id = (select package_id from created)),
  'overdue',
  'pagamento vencido fica atrasado'
);
select is(public.mark_overdue_payments(), 0, 'segunda execução não altera nada');
select is(
  (select count(*) from public.notifications
   where user_id = (select ana_id from ctx) and kind = 'payment_overdue'),
  1::bigint,
  'aluna é notificada do atraso'
);

-- Notificações de agenda: personal agenda → aluna notificada; aluna cancela → personal notificado.
create temporary table booked as
select (public.book_appointment_for_student(
  (select ana_id from ctx), (select slot_a from ctx), gen_random_uuid())).id as appointment_id;
select is(
  (select count(*) from public.notifications
   where user_id = (select ana_id from ctx) and kind = 'appointment_created'),
  1::bigint,
  'aluna é notificada da aula criada pelo personal'
);
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.cancel_appointment((select appointment_id from booked), 'Imprevisto') $$,
  'aluna cancela'
);
select is(
  (select count(*) from public.notifications
   where user_id = (select trainer_id from ctx) and kind = 'appointment_cancelled'),
  1::bigint,
  'personal é notificado do cancelamento'
);
select is(
  (select count(*) from public.notifications
   where user_id = (select ana_id from ctx) and kind = 'credits_changed' and title like '%devolvido%'),
  1::bigint,
  'aluna é notificada da devolução do crédito'
);

-- Leitura restrita e marcação como lida.
grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from public.notifications where user_id <> (select bruno_id from ctx)),
  0::bigint,
  'usuário não vê notificações de outros'
);
select pg_temp.login((select ana_id from ctx));
select ok(public.mark_notifications_read() > 0, 'aluna marca as próprias notificações como lidas');
select is(
  (select count(*) from public.notifications where user_id = (select ana_id from ctx) and read_at is null),
  0::bigint,
  'nenhuma notificação da aluna fica sem leitura'
);

select * from finish();
rollback;
