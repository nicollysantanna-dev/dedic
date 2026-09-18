-- Agendamento: sucesso, idempotência, conflito, saldo e autorização.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_a,
  ((current_date + 2)::timestamp + time '11:00') at time zone 'America/Sao_Paulo' as slot_b,
  '40000000-0000-4000-8000-000000000001'::uuid as request_a,
  '40000000-0000-4000-8000-000000000002'::uuid as request_b,
  '40000000-0000-4000-8000-000000000003'::uuid as request_c,
  '40000000-0000-4000-8000-000000000004'::uuid as request_d;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Aluna agenda um slot publicado.
select pg_temp.login((select ana_id from ctx));
select is(
  public.get_credit_balance((select ana_id from ctx)),
  10,
  'aluna começa com 10 créditos'
);
select lives_ok(
  $$ select public.book_appointment(
       (select trainer_id from ctx), (select slot_a from ctx), (select request_a from ctx)) $$,
  'aluna agenda um horário disponível'
);
select is(
  public.get_credit_balance((select ana_id from ctx)),
  9,
  'agendar consome exatamente um crédito'
);
select is(
  (select count(*) from public.appointment_events
   where student_id = (select ana_id from ctx) and event_type = 'created'),
  1::bigint,
  'agendamento registra evento de auditoria'
);

-- Clique duplicado: mesmo booking_request_id não cria outra aula nem consome crédito.
select lives_ok(
  $$ select public.book_appointment(
       (select trainer_id from ctx), (select slot_a from ctx), (select request_a from ctx)) $$,
  'repetir a mesma requisição é idempotente'
);
select is(
  (select count(*) from public.appointments where student_id = (select ana_id from ctx)),
  1::bigint,
  'requisição repetida não duplica a aula'
);
select is(
  public.get_credit_balance((select ana_id from ctx)),
  9,
  'requisição repetida não consome segundo crédito'
);

-- Conflito: outro aluno tenta o mesmo horário do mesmo personal.
select pg_temp.login((select bruno_id from ctx));
select throws_like(
  $$ select public.book_appointment(
       (select trainer_id from ctx), (select slot_a from ctx), (select request_b from ctx)) $$,
  '%SLOT_UNAVAILABLE%',
  'horário já reservado não é oferecido a outro aluno'
);

-- Exclusion constraint protege mesmo quem não passa pela geração de slots (personal).
select pg_temp.login((select trainer_id from ctx));
select throws_like(
  $$ select public.book_appointment_for_student(
       (select bruno_id from ctx), (select slot_a from ctx), (select request_b from ctx)) $$,
  '%SLOT_CONFLICT%',
  'personal não consegue sobrepor aula existente'
);
select is(
  public.get_credit_balance((select bruno_id from ctx)),
  10,
  'tentativa em conflito não deixa débito órfão'
);

-- Sem crédito: personal esgota o pacote e a próxima tentativa falha.
select lives_ok(
  $$ select public.adjust_student_credits((select bruno_id from ctx), (-10)::smallint, 'Zerar para teste') $$,
  'personal ajusta créditos com justificativa'
);
select throws_like(
  $$ select public.book_appointment_for_student(
       (select bruno_id from ctx), (select slot_b from ctx), (select request_c from ctx)) $$,
  '%INSUFFICIENT_CREDITS%',
  'sem crédito não é possível agendar'
);

-- Aluna sem vínculo não agenda com esta personal.
select pg_temp.login((select carla_id from ctx));
select throws_like(
  $$ select public.book_appointment(
       (select trainer_id from ctx), (select slot_b from ctx), (select request_d from ctx)) $$,
  '%RELATIONSHIP_REQUIRED%',
  'aluna sem vínculo ativo não agenda'
);

select * from finish();
rollback;
