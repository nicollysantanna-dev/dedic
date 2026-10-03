-- Correções após o primeiro uso real da exclusão de conta (ADR 0008):
-- 1. Conta excluída não acessa mais a API, mesmo com um token ainda válido (até 1 h).
--    Antes, uma sessão antiga editou o perfil anonimizado e trouxe nome e telefone de volta.
-- 2. Perfis excluídos são anonimizados de novo, desfazendo edições feitas depois da exclusão.
-- 3. O saldo considera só os pacotes do personal atual (aluna) ou do próprio personal;
--    créditos de um vínculo encerrado ou de um personal excluído não podem ser usados.
-- 4. O ajuste manual lança no pacote do próprio personal.

-- 1. Checagem antes de toda requisição do PostgREST.
create or replace function public.reject_deleted_accounts()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.deleted_at is not null
  ) then
    raise exception 'ACCOUNT_DELETED' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.reject_deleted_accounts() from public;
grant execute on function public.reject_deleted_accounts() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.reject_deleted_accounts';
notify pgrst, 'reload config';

-- 2. Re-anonimiza perfis excluídos que voltaram a ter dados pessoais.
update public.profiles
set full_name = 'Usuário removido', phone = null, avatar_path = null
where deleted_at is not null
  and (full_name <> 'Usuário removido' or phone is not null or avatar_path is not null);

-- 3. Saldo por personal.
create or replace function public.get_credit_balance(target_student_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare balance integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if auth.uid() <> target_student_id and not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  ) then raise exception 'RELATIONSHIP_REQUIRED'; end if;

  select coalesce(sum(transaction.amount), 0)::integer into balance
  from public.credit_transactions transaction
  join public.lesson_packages package on package.id = transaction.package_id
  where transaction.student_id = target_student_id
    and package.status = 'active'
    and (
      -- Personal: só os pacotes dele.
      (auth.uid() <> target_student_id and package.trainer_id = auth.uid())
      -- Aluno: só os pacotes do personal com vínculo ativo.
      or (auth.uid() = target_student_id and exists (
        select 1 from public.trainer_student_relationships relationship
        where relationship.student_id = target_student_id
          and relationship.trainer_id = package.trainer_id
          and relationship.status = 'active'
      ))
    );
  return balance;
end;
$$;

-- 4. Ajuste manual no pacote do próprio personal (corpo igual ao de 20260823070000,
--    com o filtro de personal na escolha do pacote).
create or replace function public.adjust_student_credits(
  target_student_id uuid,
  adjustment_amount smallint,
  adjustment_reason text
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  transaction public.credit_transactions;
  current_balance integer;
  target_package_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if adjustment_amount = 0 or adjustment_amount < -100 or adjustment_amount > 100 then
    raise exception 'INVALID_ADJUSTMENT_AMOUNT';
  end if;
  if char_length(trim(adjustment_reason)) < 4
    or char_length(trim(adjustment_reason)) > 240 then
    raise exception 'ADJUSTMENT_REASON_REQUIRED';
  end if;
  if not exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  ) then raise exception 'ACTIVE_RELATIONSHIP_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtext(target_student_id::text));
  current_balance := public.get_credit_balance(target_student_id);
  if current_balance + adjustment_amount < 0 then raise exception 'INSUFFICIENT_CREDITS'; end if;

  select package.id into target_package_id
  from public.lesson_packages package
  where package.student_id = target_student_id
    and package.trainer_id = auth.uid()
    and package.status = 'active'
  order by
    case when adjustment_amount < 0 and (
      select coalesce(sum(item.amount), 0) from public.credit_transactions item
      where item.package_id = package.id
    ) > 0 then 0 else 1 end,
    package.activated_at desc
  limit 1;
  if target_package_id is null then raise exception 'ACTIVE_PACKAGE_REQUIRED'; end if;

  insert into public.credit_transactions (
    trainer_id, student_id, package_id, amount, transaction_type, reason, created_by
  ) values (
    auth.uid(), target_student_id, target_package_id, adjustment_amount,
    'manual_adjustment', trim(adjustment_reason), auth.uid()
  ) returning * into transaction;
  return transaction;
end;
$$;
