-- Conexão com o Hevy: chave guardada no Vault, nunca lida pelo cliente; RLS só
-- deixa o dono ver o próprio status; leitura da chave decifrada é exclusiva do
-- service_role.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated, service_role;
set local role authenticated;
select pg_temp.login((select ana_id from ctx));

select lives_ok(
  $$ select public.connect_hevy_account('chave-hevy-teste-1') $$,
  'aluna conecta a conta do Hevy'
);
select is(
  (select count(*) from public.hevy_connections where user_id = (select ana_id from ctx)),
  1::bigint,
  'conexão é gravada para a aluna'
);
select isnt(
  (select connected_at from public.hevy_connections where user_id = (select ana_id from ctx)),
  null,
  'connected_at é preenchido'
);
select throws_like(
  $$ select public.connect_hevy_account('   ') $$,
  '%INVALID_API_KEY%',
  'chave vazia é recusada'
);

-- RLS: outro aluno não vê a conexão de Ana.
select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from public.hevy_connections where user_id = (select ana_id from ctx)),
  0::bigint,
  'outro aluno não vê a conexão de Ana'
);
select pg_temp.login((select ana_id from ctx));

-- Leitura da chave decifrada é exclusiva do service_role.
select throws_ok(
  $$ select public.get_hevy_api_key((select ana_id from ctx)) $$,
  '42501',
  null,
  'get_hevy_api_key é negado para authenticated'
);

create temporary table secret_before as
select secret_id from public.hevy_connections where user_id = (select ana_id from ctx);

reset role;
set local role service_role;
select is(
  public.get_hevy_api_key((select ana_id from ctx)),
  'chave-hevy-teste-1',
  'service_role lê a chave decifrada'
);
reset role;

-- Reconectar atualiza o segredo existente em vez de criar um órfão.
set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.connect_hevy_account('chave-hevy-teste-2') $$,
  'aluna reconecta com uma nova chave'
);
select is(
  (select secret_id from public.hevy_connections where user_id = (select ana_id from ctx)),
  (select secret_id from secret_before),
  'reconectar reaproveita o mesmo segredo do Vault'
);
reset role;

set local role service_role;
select is(
  public.get_hevy_api_key((select ana_id from ctx)),
  'chave-hevy-teste-2',
  'service_role lê a chave atualizada após reconectar'
);
reset role;

set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select throws_ok(
  $$ select public.record_hevy_sync_result((select ana_id from ctx), 'ok', null) $$,
  '42501',
  null,
  'record_hevy_sync_result é negado para authenticated'
);
reset role;

set local role service_role;
select lives_ok(
  $$ select public.record_hevy_sync_result('00000000-0000-4000-8000-000000000002'::uuid, 'error', 'Chave inválida ou expirada') $$,
  'service_role registra o resultado da sincronização'
);
reset role;

select is(
  (select last_sync_status from public.hevy_connections where user_id = (select ana_id from ctx)),
  'error',
  'status da última sincronização é gravado'
);

-- Desconectar remove a conexão e o segredo do Vault.
set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.disconnect_hevy_account() $$,
  'aluna desconecta a conta do Hevy'
);
select is(
  (select count(*) from public.hevy_connections where user_id = (select ana_id from ctx)),
  0::bigint,
  'conexão é removida'
);
reset role;

set local role service_role;
select is(
  public.get_hevy_api_key((select ana_id from ctx)),
  null,
  'chave não existe mais após desconectar'
);
reset role;

select * from finish();
rollback;
