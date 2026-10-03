-- Exclusão de conta por anonimização: cancela aulas futuras com devolução, apaga
-- dados de saúde, limpa notas, encerra vínculos e anonimiza o perfil (LGPD).
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '10000000-0000-4000-8000-000000000001'::uuid as ana_relationship_id,
  '10000000-0000-4000-8000-000000000002'::uuid as bruno_relationship_id,
  '20000000-0000-4000-8000-000000000001'::uuid as ana_package_id,
  '20000000-0000-4000-8000-000000000002'::uuid as bruno_package_id,
  'a0000000-0000-4000-8000-000000000001'::uuid as ana_tomorrow_id,
  'a0000000-0000-4000-8000-000000000002'::uuid as ana_today_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ana_started_id,
  'a0000000-0000-4000-8000-000000000004'::uuid as bruno_today_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as bruno_tomorrow_id,
  'b0000000-0000-4000-8000-000000000001'::uuid as workout_id,
  'c0000000-0000-4000-8000-000000000001'::uuid as accepted_invitation_id,
  'c0000000-0000-4000-8000-000000000002'::uuid as pending_invitation_id,
  ((public.local_today() + 1)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as tomorrow_slot;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

create function pg_temp.insert_appointment(
  appointment_id uuid, student uuid, relationship uuid, package uuid,
  starts timestamptz, ends timestamptz, created timestamptz
) returns void language sql as $$
  insert into public.appointments (
    id, trainer_id, student_id, relationship_id, package_id, starts_at, ends_at,
    booking_request_id, created_by, created_at
  ) values (
    appointment_id, '00000000-0000-4000-8000-000000000001', student, relationship, package,
    starts, ends, gen_random_uuid(), '00000000-0000-4000-8000-000000000001', created
  );
$$;

grant select on ctx to authenticated, service_role;

-- Arrange (como postgres): aulas da Ana — amanhã, hoje ainda não iniciada e hoje já
-- iniciada — e uma aula de Bruno hoje e outra amanhã.
select pg_temp.insert_appointment(
  (select ana_tomorrow_id from ctx), (select ana_id from ctx), (select ana_relationship_id from ctx),
  (select ana_package_id from ctx), (select tomorrow_slot from ctx),
  (select tomorrow_slot from ctx) + interval '1 hour', now());
select pg_temp.insert_appointment(
  (select ana_today_id from ctx), (select ana_id from ctx), (select ana_relationship_id from ctx),
  (select ana_package_id from ctx), now() + interval '2 hours', now() + interval '3 hours', now());
select pg_temp.insert_appointment(
  (select ana_started_id from ctx), (select ana_id from ctx), (select ana_relationship_id from ctx),
  (select ana_package_id from ctx), now() - interval '10 minutes', now(), now() - interval '1 day');
select pg_temp.insert_appointment(
  (select bruno_today_id from ctx), (select bruno_id from ctx), (select bruno_relationship_id from ctx),
  (select bruno_package_id from ctx), now() + interval '1 minute', now() + interval '2 minutes', now());
select pg_temp.insert_appointment(
  (select bruno_tomorrow_id from ctx), (select bruno_id from ctx), (select bruno_relationship_id from ctx),
  (select bruno_package_id from ctx), (select tomorrow_slot from ctx) + interval '1 hour',
  (select tomorrow_slot from ctx) + interval '2 hours', now());

-- Dados de saúde, treino com nota, convites e conexão com o Hevy.
insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
select ana_id, current_date, 68.4, ana_id from ctx
union all
select bruno_id, current_date, 80, bruno_id from ctx;
insert into public.progress_photos (student_id, taken_on, position, storage_path)
select ana_id, current_date, 'front', ana_id::text || '/foto-1.jpg' from ctx;
insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
select trainer_id, ana_id, 'weight', 68.4, 64, current_date + 90, trainer_id from ctx;
insert into public.workouts (id, student_id, name, started_at, finished_at, notes, recorded_by)
select workout_id, ana_id, 'Treino A', now() - interval '1 hour', now(), 'nota', ana_id from ctx;
insert into public.student_invitations (
  id, trainer_id, student_email, status, accepted_by, accepted_at
)
select accepted_invitation_id, trainer_id, 'aluna@dedic.local', 'accepted', ana_id, now() from ctx;
insert into public.student_invitations (id, trainer_id, student_phone)
select pending_invitation_id, trainer_id, '+5511999990099' from ctx;
insert into public.hevy_connections (user_id, secret_id)
select ana_id, vault.create_secret('chave-hevy', 'hevy_api_key:' || ana_id::text) from ctx;

-- Só service_role executa a RPC.
set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select throws_ok(
  $$ select public.delete_account((select ana_id from ctx)) $$,
  '42501', null,
  'usuário autenticado não executa delete_account'
);
reset role;

set local role service_role;
select lives_ok(
  $$ select public.delete_account((select ana_id from ctx)) $$,
  'service_role exclui a conta da aluna'
);
reset role;

-- Aulas: as não iniciadas são canceladas pela aluna (inclusive a de hoje).
select is(
  (select status from public.appointments where id = (select ana_tomorrow_id from ctx)),
  'cancelled_by_student'::public.appointment_status,
  'aula de amanhã cancelada pela aluna'
);
select is(
  (select status from public.appointments where id = (select ana_today_id from ctx)),
  'cancelled_by_student'::public.appointment_status,
  'aula de hoje ainda não iniciada também é cancelada'
);
select is(
  (select status from public.appointments where id = (select ana_started_id from ctx)),
  'scheduled'::public.appointment_status,
  'aula já iniciada não é cancelada'
);
select is(
  (select count(*) from public.credit_transactions
   where student_id = (select ana_id from ctx) and transaction_type = 'cancellation_refund'),
  2::bigint,
  'cada aula cancelada gera uma devolução no extrato'
);
select is(
  (select count(*) from public.appointment_events
   where student_id = (select ana_id from ctx) and event_type = 'cancelled'
     and actor_id = (select ana_id from ctx)),
  2::bigint,
  'eventos de cancelamento registram a aluna como autora'
);
select ok(
  exists (
    select 1 from public.notifications
    where user_id = (select trainer_id from ctx)
      and kind = 'appointment_cancelled'
      and body like 'Ana %'
  ),
  'personal é notificado com o nome da aluna antes da anonimização'
);

-- Dados de saúde apagados.
select is(
  (select count(*) from public.progress_entries where student_id = (select ana_id from ctx)),
  0::bigint,
  'registros de progresso da aluna apagados'
);
select is(
  (select count(*) from public.progress_photos where student_id = (select ana_id from ctx)),
  0::bigint,
  'fotos de evolução da aluna apagadas'
);
select is(
  (select count(*) from public.student_goals where student_id = (select ana_id from ctx)),
  0::bigint,
  'metas da aluna apagadas'
);

-- Treino mantido sem notas.
select ok(
  exists (
    select 1 from public.workouts
    where id = (select workout_id from ctx) and notes is null
  ),
  'treino permanece e a nota é limpa'
);

-- Vínculo e convites.
select is(
  (select status from public.trainer_student_relationships
   where id = (select ana_relationship_id from ctx)),
  'ended'::public.relationship_status,
  'vínculo da aluna encerrado'
);
select ok(
  exists (
    select 1 from public.student_invitations
    where id = (select accepted_invitation_id from ctx)
      and student_email is null and student_phone is null
      and accepted_by = (select ana_id from ctx)
  ),
  'convite aceito perde o contato e mantém accepted_by'
);
select is(
  (select status from public.student_invitations where id = (select pending_invitation_id from ctx)),
  'pending'::public.invitation_status,
  'convite pendente do personal não é afetado pela exclusão da aluna'
);

-- Hevy desconectado e segredo removido do Vault.
select is(
  (select count(*) from public.hevy_connections where user_id = (select ana_id from ctx)),
  0::bigint,
  'conexão com o Hevy apagada'
);
select is(
  (select count(*) from vault.secrets where name = 'hevy_api_key:' || (select ana_id from ctx)::text),
  0::bigint,
  'chave do Hevy removida do Vault'
);

-- Perfil anonimizado.
select is(
  (select full_name from public.profiles where id = (select ana_id from ctx)),
  'Usuário removido',
  'nome anonimizado'
);
select ok(
  (select phone is null from public.profiles where id = (select ana_id from ctx)),
  'telefone removido'
);
select ok(
  (select avatar_path is null from public.profiles where id = (select ana_id from ctx)),
  'avatar removido'
);
select ok(
  (select deleted_at is not null from public.profiles where id = (select ana_id from ctx)),
  'perfil marcado como excluído'
);
select is(
  (select count(*) from public.notifications where user_id = (select ana_id from ctx)),
  0::bigint,
  'notificações da aluna apagadas'
);

-- Idempotência: segunda chamada não devolve créditos adicionais.
set local role service_role;
select lives_ok(
  $$ select public.delete_account((select ana_id from ctx)) $$,
  'segunda exclusão não gera erro'
);
reset role;
select is(
  (select count(*) from public.credit_transactions
   where student_id = (select ana_id from ctx) and transaction_type = 'cancellation_refund'),
  2::bigint,
  'segunda exclusão não devolve créditos adicionais'
);

-- Fora da RPC as travas continuam valendo.
select throws_like(
  $$ delete from public.progress_entries where student_id = (select bruno_id from ctx) $$,
  '%PROGRESS_ENTRIES_ARE_IMMUTABLE%',
  'fora da exclusão de conta, registros de progresso continuam imutáveis'
);
set local role authenticated;
select pg_temp.login((select bruno_id from ctx));
select throws_like(
  $$ select public.cancel_appointment((select bruno_today_id from ctx)) $$,
  '%SAME_DAY_APPOINTMENT_LOCKED%',
  'fora da exclusão de conta, a trava do mesmo dia continua ativa'
);
reset role;

-- Cenário personal: cancela aulas dos alunos, encerra vínculos e convites.
-- Fica por último e sem savepoint: um rollback to savepoint descartaria também os
-- resultados do pgTAP; o rollback final desfaz tudo.
set local role service_role;
select lives_ok(
  $$ select public.delete_account((select trainer_id from ctx)) $$,
  'service_role exclui a conta do personal'
);
reset role;
select is(
  (select status from public.appointments where id = (select bruno_tomorrow_id from ctx)),
  'cancelled_by_trainer'::public.appointment_status,
  'aula futura de Bruno cancelada pelo personal'
);
select is(
  (select status from public.trainer_student_relationships
   where id = (select bruno_relationship_id from ctx)),
  'ended'::public.relationship_status,
  'vínculo de Bruno encerrado'
);
select ok(
  exists (
    select 1 from public.notifications
    where user_id = (select bruno_id from ctx)
      and kind = 'appointment_cancelled'
      and link = '/app/agenda?aula=' || (select bruno_tomorrow_id from ctx)
  ),
  'Bruno é notificado do cancelamento'
);
select is(
  (select status from public.student_invitations where id = (select pending_invitation_id from ctx)),
  'cancelled'::public.invitation_status,
  'convite pendente enviado pelo personal é cancelado'
);

select * from finish();
rollback;
