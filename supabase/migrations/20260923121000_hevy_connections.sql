-- Conexão do aluno com o Hevy: guarda a chave de API no Supabase Vault (nunca em
-- coluna de texto simples) e o status da última sincronização. Toda escrita passa
-- por função security definer; o cliente autenticado só lê o próprio status.

create table public.hevy_connections (
  user_id uuid primary key references public.profiles (id),
  secret_id uuid not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status is null or last_sync_status in ('ok', 'error')),
  last_sync_error text check (last_sync_error is null or char_length(last_sync_error) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.hevy_connections enable row level security;

create policy hevy_connections_select_own
on public.hevy_connections for select
to authenticated
using (user_id = (select auth.uid()));

grant select on public.hevy_connections to authenticated, service_role;

-- Conecta ou reconecta: grava/atualiza a chave no Vault e faz upsert da conexão.
-- Não valida a chave contra a API do Hevy aqui (só na primeira sincronização).
create or replace function public.connect_hevy_account(requested_api_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_key text := nullif(btrim(requested_api_key), '');
  existing_secret_id uuid;
  new_secret_id uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if normalized_key is null then raise exception 'INVALID_API_KEY'; end if;

  select secret_id into existing_secret_id from public.hevy_connections where user_id = actor;

  if existing_secret_id is not null then
    perform vault.update_secret(existing_secret_id, normalized_key);
    update public.hevy_connections
    set connected_at = now(), last_synced_at = null, last_sync_status = null,
        last_sync_error = null, updated_at = now()
    where user_id = actor;
  else
    new_secret_id := vault.create_secret(normalized_key, 'hevy_api_key:' || actor::text);
    insert into public.hevy_connections (user_id, secret_id)
    values (actor, new_secret_id);
  end if;
end;
$$;

revoke all on function public.connect_hevy_account(text) from public;
grant execute on function public.connect_hevy_account(text) to authenticated;

create or replace function public.disconnect_hevy_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing_secret_id uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select secret_id into existing_secret_id from public.hevy_connections where user_id = actor;
  if existing_secret_id is null then return; end if;

  delete from public.hevy_connections where user_id = actor;
  delete from vault.secrets where id = existing_secret_id;
end;
$$;

revoke all on function public.disconnect_hevy_account() from public;
grant execute on function public.disconnect_hevy_account() to authenticated;

-- Só a função serverless (service_role) decifra a chave — nem o próprio dono
-- consegue lê-la de volta pelo cliente.
create or replace function public.get_hevy_api_key(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select secret.decrypted_secret
  from public.hevy_connections connection
  join vault.decrypted_secrets secret on secret.id = connection.secret_id
  where connection.user_id = target_user_id;
$$;

revoke all on function public.get_hevy_api_key(uuid) from public;
grant execute on function public.get_hevy_api_key(uuid) to service_role;

create or replace function public.record_hevy_sync_result(
  target_user_id uuid,
  sync_status text,
  sync_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.hevy_connections
  set last_synced_at = now(),
      last_sync_status = sync_status,
      last_sync_error = nullif(btrim(coalesce(sync_error, '')), ''),
      updated_at = now()
  where user_id = target_user_id;
end;
$$;

revoke all on function public.record_hevy_sync_result(uuid, text, text) from public;
grant execute on function public.record_hevy_sync_result(uuid, text, text) to service_role;
