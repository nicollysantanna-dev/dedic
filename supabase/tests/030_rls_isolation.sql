-- Isolamento entre usuários via Row Level Security (papel authenticated).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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

-- Dados de teste criados como superusuário antes de assumir o papel authenticated.
select pg_temp.login((select ana_id from ctx));
create temporary table booked as
select (public.book_appointment(
  (select trainer_id from ctx), (select slot_a from ctx), gen_random_uuid()
)).id as ana_appointment_id;

grant select on ctx, booked to authenticated;
set local role authenticated;

-- Aluna vê apenas o próprio mundo.
select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from public.appointments),
  1::bigint,
  'aluna vê somente as próprias aulas'
);
select is(
  (select count(*) from public.credit_transactions where student_id <> (select ana_id from ctx)),
  0::bigint,
  'aluna não vê extrato de outros alunos'
);
select is(
  (select count(*) from public.lesson_packages where student_id = (select bruno_id from ctx)),
  0::bigint,
  'aluna não vê pacotes de outros alunos'
);
select is(
  (select count(*) from public.payments where student_id = (select bruno_id from ctx)),
  0::bigint,
  'aluna não vê pagamentos de outros alunos'
);
select is(
  (select count(*) from public.profiles),
  2::bigint,
  'aluna enxerga apenas o próprio perfil e o da personal vinculada'
);
select is(
  (select count(*) from public.availability_rules),
  7::bigint,
  'aluna vinculada lê a disponibilidade da personal'
);

-- Escritas diretas são bloqueadas para quem não é o papel certo.
select throws_ok(
  $$ insert into public.credit_transactions (trainer_id, student_id, amount, transaction_type, created_by)
     values ((select trainer_id from ctx), (select ana_id from ctx), 5, 'manual_adjustment', (select ana_id from ctx)) $$,
  '42501',
  null,
  'aluna não insere lançamentos de crédito diretamente'
);
select throws_ok(
  $$ update public.appointments set status = 'completed' where id = (select ana_appointment_id from booked) $$,
  '42501',
  null,
  'aluna não altera o estado da aula diretamente'
);
select throws_ok(
  $$ insert into public.availability_rules (trainer_id, iso_weekday, start_time, end_time)
     values ((select trainer_id from ctx), 1, '13:00', '14:00') $$,
  '42501',
  null,
  'aluna não cria disponibilidade para a personal'
);

-- Outro aluno (Bruno) não enxerga a aula da aluna.
select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from public.appointments where id = (select ana_appointment_id from booked)),
  0::bigint,
  'outro aluno não vê a aula da aluna'
);
select throws_like(
  $$ select public.cancel_appointment((select ana_appointment_id from booked)) $$,
  '%APPOINTMENT_ACCESS_DENIED%',
  'outro aluno não cancela a aula da aluna via RPC'
);

-- Aluna sem vínculo (Carla) não vê nada da personal.
select pg_temp.login((select carla_id from ctx));
select is(
  (select count(*) from public.availability_rules),
  0::bigint,
  'sem vínculo não há acesso à disponibilidade'
);
select is(
  (select count(*) from public.profiles where id = (select trainer_id from ctx)),
  0::bigint,
  'sem vínculo não há acesso ao perfil da personal'
);

-- Personal enxerga os alunos vinculados, mas não a aluna externa.
select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.profiles where role = 'student'),
  2::bigint,
  'personal vê apenas alunos com vínculo'
);

select * from finish();
rollback;
