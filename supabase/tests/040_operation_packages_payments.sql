-- Operação da aula, conclusão automática, pacotes, ajustes e pagamentos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '10000000-0000-4000-8000-000000000001'::uuid as ana_relationship_id,
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_a,
  ((current_date + 2)::timestamp + time '11:00') at time zone 'America/Sao_Paulo' as slot_b;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

select pg_temp.login((select trainer_id from ctx));
create temporary table booked as
select
  (public.book_appointment_for_student((select ana_id from ctx), (select slot_a from ctx), gen_random_uuid())).id as manual_id,
  (public.book_appointment_for_student((select ana_id from ctx), (select slot_b from ctx), gen_random_uuid())).id as auto_id;

select is(public.get_credit_balance((select ana_id from ctx)), 8, 'agendamento manual pelo personal consome créditos');
select is(
  (select details ->> 'created_by_role' from public.appointment_events
   where appointment_id = (select manual_id from booked) and event_type = 'created'),
  'trainer',
  'autoria do agendamento manual fica registrada'
);

-- Aula ainda não começou: não pode ser concluída.
select throws_like(
  $$ select public.complete_appointment((select manual_id from booked), 'completed') $$,
  '%APPOINTMENT_NOT_STARTED%',
  'aula futura não pode ser marcada como realizada'
);

-- Simula as aulas já iniciadas/terminadas.
update public.appointments
set starts_at = now() - interval '4 hours', ends_at = now() - interval '3 hours',
    created_at = now() - interval '5 hours'
where id = (select manual_id from booked);
update public.appointments
set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour',
    created_at = now() - interval '5 hours'
where id = (select auto_id from booked);

-- Aluna não conclui; personal registra falta e mantém o crédito consumido.
select pg_temp.login((select ana_id from ctx));
select throws_like(
  $$ select public.complete_appointment((select manual_id from booked), 'student_no_show') $$,
  '%TRAINER_REQUIRED%',
  'aluna não registra o desfecho da aula'
);
select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ select public.complete_appointment((select manual_id from booked), 'student_no_show') $$,
  'personal registra falta'
);
select is(public.get_credit_balance((select ana_id from ctx)), 8, 'falta mantém o crédito consumido');
select lives_ok(
  $$ select public.complete_appointment((select manual_id from booked), 'student_no_show') $$,
  'registrar a mesma falta duas vezes é idempotente'
);
select is(
  (select count(*) from public.appointment_events
   where appointment_id = (select manual_id from booked) and event_type = 'student_no_show'),
  1::bigint,
  'falta idempotente gera um único evento'
);

-- Correção exige justificativa e gera auditoria.
select throws_like(
  $$ select public.correct_appointment_outcome((select manual_id from booked), 'completed', 'x') $$,
  '%CORRECTION_REASON_REQUIRED%',
  'correção sem justificativa é recusada'
);
select lives_ok(
  $$ select public.correct_appointment_outcome((select manual_id from booked), 'completed', 'Aluna compareceu atrasada') $$,
  'correção com justificativa é aceita'
);
select is(
  (select details ->> 'reason' from public.appointment_events
   where appointment_id = (select manual_id from booked) and event_type = 'completed'
   order by created_at desc limit 1),
  'Aluna compareceu atrasada',
  'justificativa da correção fica na auditoria'
);

-- Conclusão automática após o horário final, idempotente.
select is(public.finalize_elapsed_appointments(), 1, 'cron conclui a aula que já terminou');
select is(
  (select status from public.appointments where id = (select auto_id from booked)),
  'completed',
  'aula finalizada automaticamente fica como realizada'
);
select is(public.finalize_elapsed_appointments(), 0, 'segunda execução do cron não altera nada');

-- Pacote: ativação gera entrada no extrato e o saldo acumula.
create temporary table pkg as
select '20000000-0000-4000-8000-000000000099'::uuid as id;
insert into public.lesson_packages (
  id, trainer_id, student_id, relationship_id, lesson_count, price_cents, starts_on, expires_on
) values (
  (select id from pkg), (select trainer_id from ctx), (select ana_id from ctx),
  (select ana_relationship_id from ctx), 4, 48000, current_date, current_date + 90
);
select lives_ok(
  $$ select public.activate_lesson_package((select id from pkg)) $$,
  'personal ativa pacote em rascunho'
);
select is(public.get_credit_balance((select ana_id from ctx)), 12, 'novo pacote acumula créditos');
select throws_like(
  $$ select public.activate_lesson_package((select id from pkg)) $$,
  '%PACKAGE_NOT_DRAFT%',
  'pacote não é ativado duas vezes'
);

-- Extrato é imutável.
select throws_like(
  $$ delete from public.credit_transactions where student_id = (select ana_id from ctx) $$,
  '%CREDIT_TRANSACTIONS_ARE_IMMUTABLE%',
  'lançamentos de crédito não podem ser apagados'
);

-- Pagamento: registro idempotente com histórico.
select lives_ok(
  $$ select public.save_payment(
       '50000000-0000-4000-8000-000000000001', (select id from pkg), 48000, current_date + 10, 'pending') $$,
  'personal registra cobrança'
);

select * from finish();
rollback;
