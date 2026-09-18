-- Perfil por RPC, encerramento de vínculo, cancelamento de convite e claim por celular.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  '10000000-0000-4000-8000-000000000002'::uuid as bruno_relationship_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Perfil: personal edita nome, telefone e duração; aluna não define duração.
select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ select public.update_own_profile('Paula P. Silva', '+5511988887777', 45::smallint) $$,
  'personal atualiza o próprio perfil'
);
select is(
  (select default_lesson_duration_minutes from public.profiles where id = (select trainer_id from ctx)),
  45::smallint,
  'duração padrão atualizada'
);
select throws_like(
  $$ select public.update_own_profile('Paula', '+5511988887777', 50::smallint) $$,
  '%INVALID_LESSON_DURATION%',
  'duração fora das opções é recusada'
);
select throws_like(
  $$ select public.update_own_profile('P', null, 60::smallint) $$,
  '%INVALID_FULL_NAME%',
  'nome curto é recusado'
);
select throws_like(
  $$ select public.update_own_profile('Paula', '11 98888-7777', 60::smallint) $$,
  '%INVALID_PHONE%',
  'telefone fora do E.164 é recusado'
);

select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.update_own_profile('Ana Aluna Souza', null, 90::smallint) $$,
  'aluna atualiza o próprio perfil'
);
select is(
  (select default_lesson_duration_minutes from public.profiles where id = (select ana_id from ctx)),
  null,
  'duração enviada pela aluna é ignorada'
);

-- Escrita direta em profiles continua bloqueada.
grant select on ctx to authenticated;
set local role authenticated;
select throws_ok(
  $$ update public.profiles set role = 'trainer' where id = (select ana_id from ctx) $$,
  '42501',
  null,
  'aluna não altera o próprio papel diretamente'
);
select throws_ok(
  $$ update public.trainer_student_relationships set status = 'ended' $$,
  '42501',
  null,
  'não há UPDATE direto em vínculos'
);
select throws_ok(
  $$ update public.student_invitations set status = 'accepted' $$,
  '42501',
  null,
  'não há UPDATE direto em convites'
);
reset role;

-- Encerramento de vínculo: só o personal dono, idempotente, preserva histórico.
select pg_temp.login((select ana_id from ctx));
select throws_like(
  $$ select public.end_relationship((select bruno_relationship_id from ctx)) $$,
  '%TRAINER_REQUIRED%',
  'aluna não encerra vínculo de outro aluno'
);
select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ select public.end_relationship((select bruno_relationship_id from ctx)) $$,
  'personal encerra o vínculo'
);
select is(
  (select status from public.trainer_student_relationships where id = (select bruno_relationship_id from ctx)),
  'ended',
  'vínculo fica encerrado'
);
select lives_ok(
  $$ select public.end_relationship((select bruno_relationship_id from ctx)) $$,
  'encerrar de novo é idempotente'
);
select is(
  (select count(*) from public.credit_transactions where student_id = (select bruno_id from ctx)),
  1::bigint,
  'extrato do aluno permanece após o encerramento'
);

-- Após o encerramento, Bruno não vê mais a personal nem agenda com ela.
set local role authenticated;
select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from public.availability_rules),
  0::bigint,
  'aluno com vínculo encerrado não vê a disponibilidade'
);
reset role;

-- Convite por celular: cancelamento por RPC e claim vinculado ao telefone.
select pg_temp.login((select trainer_id from ctx));
create temporary table invite as
select '60000000-0000-4000-8000-000000000001'::uuid as id,
       '60000000-0000-4000-8000-0000000000aa'::uuid as token;
insert into public.student_invitations (id, token, trainer_id, student_email, student_phone)
values ((select id from invite), (select token from invite), (select trainer_id from ctx), null, '+5511977776666');

select pg_temp.login((select carla_id from ctx));
update public.profiles set phone = '+5511900000000' where id = (select carla_id from ctx);
select throws_like(
  $$ select public.claim_student_invitation((select token from invite)) $$,
  '%INVITATION_PHONE_MISMATCH%',
  'aluna com outro telefone não reivindica o convite'
);
update public.profiles set phone = null where id = (select carla_id from ctx);
select lives_ok(
  $$ select public.claim_student_invitation((select token from invite)) $$,
  'aluna sem telefone reivindica pelo link privado'
);
select is(
  (select phone from public.profiles where id = (select carla_id from ctx)),
  '+5511977776666',
  'telefone do convite é registrado no perfil'
);

select pg_temp.login((select trainer_id from ctx));
select throws_like(
  $$ select public.cancel_student_invitation('00000000-0000-4000-8000-0000000000ff') $$,
  '%INVITATION_NOT_FOUND%',
  'cancelar convite inexistente falha de forma explícita'
);

select * from finish();
rollback;
