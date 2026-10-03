-- Contas excluídas não acessam mais a API e o saldo considera só o personal atual.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000004'::uuid as former_trainer_id,
  '15000000-0000-4000-8000-000000000001'::uuid as former_relationship_id,
  '25000000-0000-4000-8000-000000000001'::uuid as former_package_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Ana teve um personal anterior (vínculo encerrado) com 5 créditos que não usa mais.
insert into public.trainer_student_relationships (id, trainer_id, student_id, status, started_at, ended_at)
select former_relationship_id, former_trainer_id, ana_id, 'ended', now() - interval '60 days', now() - interval '1 day'
from ctx;
insert into public.lesson_packages (
  id, trainer_id, student_id, relationship_id, lesson_count, price_cents,
  starts_on, expires_on, status, activated_at
)
select former_package_id, former_trainer_id, ana_id, former_relationship_id, 5, 50000,
  current_date - 60, current_date + 300, 'active', now() + interval '1 minute'
from ctx;
insert into public.credit_transactions (
  trainer_id, student_id, package_id, amount, transaction_type, reason, created_by
)
select former_trainer_id, ana_id, former_package_id, 5, 'package_activation',
  'Ativação do pacote', former_trainer_id
from ctx;

grant select on ctx to authenticated;
set local role authenticated;

-- Saldo: só pacotes do personal com vínculo ativo (aluna) ou do próprio personal.
select pg_temp.login((select ana_id from ctx));
select is(
  public.get_credit_balance((select ana_id from ctx)),
  10,
  'aluna vê só os créditos do personal com vínculo ativo'
);
select pg_temp.login((select trainer_id from ctx));
select is(
  public.get_credit_balance((select ana_id from ctx)),
  10,
  'personal vê só os créditos dos pacotes dele'
);

select is(
  (select package.trainer_id
   from public.adjust_student_credits((select ana_id from ctx), 1::smallint, 'Aula de reposição') adjustment
   join public.lesson_packages package on package.id = adjustment.package_id),
  (select trainer_id from ctx),
  'ajuste manual cai num pacote do próprio personal'
);

-- Bloqueio de contas excluídas em toda requisição da API.
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.reject_deleted_accounts() $$,
  'conta ativa passa pela checagem'
);

reset role;
update public.profiles set deleted_at = now() where id = (select ana_id from ctx);
set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select throws_ok(
  $$ select public.reject_deleted_accounts() $$,
  '42501',
  'ACCOUNT_DELETED',
  'conta excluída é recusada mesmo com token ainda válido'
);
reset role;

select ok(
  exists (
    select 1 from pg_db_role_setting setting
    join pg_roles role on role.oid = setting.setrole
    where role.rolname = 'authenticator'
      and 'pgrst.db_pre_request=public.reject_deleted_accounts' = any(setting.setconfig)
  ),
  'PostgREST roda a checagem antes de toda requisição'
);
select is(
  (select count(*) from pg_proc where proname = 'reject_deleted_accounts'
     and pg_get_function_identity_arguments(oid) = ''),
  1::bigint,
  'função de checagem existe sem argumentos'
);

-- Perfis excluídos permanecem anônimos.
select is(
  (select count(*) from public.profiles
   where deleted_at is not null and id <> (select ana_id from ctx)
     and (full_name <> 'Usuário removido' or phone is not null or avatar_path is not null)),
  0::bigint,
  'nenhum perfil excluído guarda nome, telefone ou foto'
);

select * from finish();
rollback;
