-- Cancelamento idempotente, trava de mesmo dia e remarcação com rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_a,
  ((current_date + 2)::timestamp + time '11:00') at time zone 'America/Sao_Paulo' as slot_b,
  ((current_date + 2)::timestamp + time '12:00') at time zone 'America/Sao_Paulo' as slot_c,
  ((current_date + 3)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_d;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Cenário: aluna agenda A, Bruno agenda B.
select pg_temp.login((select ana_id from ctx));
create temporary table booked as
select (public.book_appointment(
  (select trainer_id from ctx), (select slot_a from ctx), gen_random_uuid()
)).id as ana_appointment_id;

select pg_temp.login((select bruno_id from ctx));
create temporary table booked_bruno as
select (public.book_appointment(
  (select trainer_id from ctx), (select slot_b from ctx), gen_random_uuid()
)).id as bruno_appointment_id;

-- Cancelamento pela aluna devolve um crédito, uma única vez.
select pg_temp.login((select ana_id from ctx));
select is(public.get_credit_balance((select ana_id from ctx)), 9, 'saldo após agendar é 9');
select lives_ok(
  $$ select public.cancel_appointment((select ana_appointment_id from booked), 'Viagem') $$,
  'aluna cancela até o dia anterior'
);
select is(public.get_credit_balance((select ana_id from ctx)), 10, 'cancelar devolve um crédito');
select is(
  (select status from public.appointments where id = (select ana_appointment_id from booked)),
  'cancelled_by_student',
  'aula fica registrada como cancelada pela aluna'
);
select lives_ok(
  $$ select public.cancel_appointment((select ana_appointment_id from booked), 'De novo') $$,
  'cancelar novamente não gera erro'
);
select is(public.get_credit_balance((select ana_id from ctx)), 10, 'cancelar novamente não devolve segundo crédito');
select is(
  (select count(*) from public.credit_transactions
   where appointment_id = (select ana_appointment_id from booked)
     and transaction_type = 'cancellation_refund'),
  1::bigint,
  'existe exatamente um lançamento de devolução'
);
select is(
  (select details ->> 'reason' from public.appointment_events
   where appointment_id = (select ana_appointment_id from booked) and event_type = 'cancelled'),
  'Viagem',
  'motivo do cancelamento fica na auditoria'
);

-- Outro participante não cancela a aula de Bruno.
select throws_like(
  $$ select public.cancel_appointment((select bruno_appointment_id from booked_bruno)) $$,
  '%APPOINTMENT_ACCESS_DENIED%',
  'aluna não cancela aula de outro aluno'
);

-- Trava de mesmo dia: aula hoje não pode ser cancelada (simulada movendo a data).
select pg_temp.login((select trainer_id from ctx));
-- Último minuto do dia local: ainda no futuro e ainda "hoje" em São Paulo.
update public.appointments
set starts_at = (public.local_today()::timestamp + time '23:58') at time zone 'America/Sao_Paulo',
    ends_at = (public.local_today()::timestamp + time '23:59') at time zone 'America/Sao_Paulo'
where id = (select bruno_appointment_id from booked_bruno);
select throws_like(
  $$ select public.cancel_appointment((select bruno_appointment_id from booked_bruno)) $$,
  '%SAME_DAY_APPOINTMENT_LOCKED%',
  'no dia da aula o cancelamento é bloqueado'
);
update public.appointments
set starts_at = (select slot_b from ctx), ends_at = (select slot_b from ctx) + interval '1 hour'
where id = (select bruno_appointment_id from booked_bruno);

-- Remarcação: Bruno move B para D mantendo um único consumo líquido.
select pg_temp.login((select bruno_id from ctx));
create temporary table rescheduled as
select (public.reschedule_appointment(
  (select bruno_appointment_id from booked_bruno), (select slot_d from ctx), gen_random_uuid()
)).id as new_id;
select is(public.get_credit_balance((select bruno_id from ctx)), 9, 'remarcar mantém um consumo líquido');
select is(
  (select status from public.appointments where id = (select bruno_appointment_id from booked_bruno)),
  'cancelled_for_reschedule',
  'aula original fica como cancelada por remarcação'
);
select is(
  (select rescheduled_from_id from public.appointments where id = (select new_id from rescheduled)),
  (select bruno_appointment_id from booked_bruno),
  'nova aula aponta para a original'
);

-- Rollback: remarcar para horário ocupado mantém a aula atual intacta.
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.book_appointment(
       (select trainer_id from ctx), (select slot_c from ctx), gen_random_uuid()) $$,
  'aluna ocupa o horário C'
);
select pg_temp.login((select bruno_id from ctx));
select throws_like(
  $$ select public.reschedule_appointment(
       (select new_id from rescheduled), (select slot_c from ctx), gen_random_uuid()) $$,
  '%SLOT_UNAVAILABLE%',
  'remarcar para horário ocupado falha'
);
select is(
  (select status from public.appointments where id = (select new_id from rescheduled)),
  'scheduled',
  'falha na remarcação preserva a aula atual'
);
select is(public.get_credit_balance((select bruno_id from ctx)), 9, 'falha na remarcação não altera saldo');

select * from finish();
rollback;
