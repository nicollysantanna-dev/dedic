-- Evolução editável: aluno e personal vinculado editam e apagam registros e metas do aluno.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  '71000000-0000-4000-8000-000000000001'::uuid as ana_own_entry,
  '71000000-0000-4000-8000-000000000002'::uuid as ana_trainer_entry,
  '71000000-0000-4000-8000-000000000003'::uuid as ana_extra_entry,
  '71000000-0000-4000-8000-000000000004'::uuid as carla_entry,
  '72000000-0000-4000-8000-000000000001'::uuid as ana_goal,
  '72000000-0000-4000-8000-000000000002'::uuid as carla_goal,
  '72000000-0000-4000-8000-000000000003'::uuid as ana_other_trainer_goal,
  '72000000-0000-4000-8000-000000000004'::uuid as ana_second_goal,
  '72000000-0000-4000-8000-000000000005'::uuid as bruno_goal,
  '71000000-0000-4000-8000-000000000005'::uuid as bruno_entry;

insert into public.progress_entries (id, student_id, recorded_on, weight_kg, recorded_by)
select ana_own_entry, ana_id, current_date, 68.4, ana_id from ctx
union all select ana_trainer_entry, ana_id, current_date, 68.0, trainer_id from ctx
union all select ana_extra_entry, ana_id, current_date, 67.9, ana_id from ctx
union all select carla_entry, carla_id, current_date, 60.0, carla_id from ctx;

insert into public.student_goals (
  id, trainer_id, student_id, kind, initial_value, target_value, target_date, created_by
)
select ana_goal, trainer_id, ana_id, 'weight'::public.goal_kind, 68.4, 64, current_date + 90, trainer_id from ctx
union all
select carla_goal, trainer_id, carla_id, 'weight'::public.goal_kind, 60, 58, current_date + 90, trainer_id from ctx
union all
-- Meta de Ana criada por outro perfil (simula um personal anterior).
select ana_other_trainer_goal, carla_id, ana_id, 'weight'::public.goal_kind, 70, 66, current_date + 90, carla_id from ctx
union all
select ana_second_goal, trainer_id, ana_id, 'weight'::public.goal_kind, 68, 65, current_date + 60, trainer_id from ctx
union all
select bruno_goal, trainer_id, bruno_id, 'weight'::public.goal_kind, 80, 75, current_date + 90, trainer_id from ctx;

insert into public.progress_entries (id, student_id, recorded_on, weight_kg, recorded_by)
select bruno_entry, bruno_id, current_date, 80, bruno_id from ctx;

-- Vínculo de Bruno encerrado: o personal perde o acesso de edição.
update public.trainer_student_relationships
set status = 'ended', ended_at = now()
where student_id = (select bruno_id from ctx);

-- Permissão por coluna: nenhuma permissão de UPDATE na tabela inteira.
select ok(
  not has_table_privilege('authenticated', 'public.progress_entries', 'UPDATE'),
  'authenticated não tem UPDATE na tabela progress_entries inteira'
);
select ok(
  not has_table_privilege('authenticated', 'public.student_goals', 'UPDATE'),
  'authenticated não tem UPDATE na tabela student_goals inteira'
);

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated;
set local role authenticated;

-- Aluna: edita e apaga qualquer registro e meta dela, inclusive os do personal.
select pg_temp.login((select ana_id from ctx));
with changed as (
  update public.progress_entries set weight_kg = 67.5
  where id = (select ana_trainer_entry from ctx) returning 1
)
select is((select count(*) from changed), 1::bigint, 'aluna edita registro feito pelo personal');
select ok(
  (select updated_by = (select ana_id from ctx) and updated_at is not null
   from public.progress_entries where id = (select ana_trainer_entry from ctx)),
  'edição registra autor e data'
);
select throws_ok(
  $$ update public.progress_entries set student_id = (select bruno_id from ctx)
     where id = (select ana_own_entry from ctx) $$,
  '42501', null,
  'registro não muda de aluno'
);
select throws_ok(
  $$ update public.progress_entries set recorded_by = (select ana_id from ctx)
     where id = (select ana_trainer_entry from ctx) $$,
  '42501', null,
  'autor original do registro não muda'
);
with removed as (
  delete from public.progress_entries where id = (select ana_own_entry from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'aluna apaga o próprio registro');
with changed as (
  update public.progress_entries set weight_kg = 59
  where id = (select carla_entry from ctx) returning 1
)
select is((select count(*) from changed), 0::bigint, 'aluna não edita registro de outra aluna');
with changed as (
  update public.student_goals set target_value = 63, target_date = current_date + 120
  where id = (select ana_goal from ctx) returning 1
)
select is((select count(*) from changed), 1::bigint, 'aluna edita a própria meta');
select throws_ok(
  $$ update public.student_goals set trainer_id = (select ana_id from ctx)
     where id = (select ana_goal from ctx) $$,
  '42501', null,
  'meta não muda de personal'
);

-- Personal vinculado: edita e apaga registros e metas da aluna.
select pg_temp.login((select trainer_id from ctx));
with changed as (
  update public.progress_entries set note = 'Corrigido'
  where id = (select ana_extra_entry from ctx) returning 1
)
select is((select count(*) from changed), 1::bigint, 'personal edita registro feito pela aluna');
select is(
  (select updated_by from public.progress_entries where id = (select ana_extra_entry from ctx)),
  (select trainer_id from ctx),
  'edição do personal registra o personal como autor da alteração'
);
with removed as (
  delete from public.progress_entries where id = (select ana_trainer_entry from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'personal apaga registro da aluna vinculada');
with changed as (
  update public.student_goals set target_value = 62
  where id = (select ana_goal from ctx) returning 1
)
select is((select count(*) from changed), 1::bigint, 'personal edita meta da aluna vinculada');

-- Personal sem vínculo ativo não mexe em nada.
with changed as (
  update public.progress_entries set weight_kg = 59
  where id = (select carla_entry from ctx) returning 1
)
select is((select count(*) from changed), 0::bigint, 'personal sem vínculo não edita registro');
with removed as (
  delete from public.progress_entries where id = (select carla_entry from ctx) returning 1
)
select is((select count(*) from removed), 0::bigint, 'personal sem vínculo não apaga registro');
with changed as (
  update public.student_goals set status = 'abandoned'
  where id = (select carla_goal from ctx) returning 1
)
select is((select count(*) from changed), 0::bigint, 'personal sem vínculo não altera meta antiga');

-- Outro aluno não mexe nos dados da aluna.
select pg_temp.login((select bruno_id from ctx));
with removed as (
  delete from public.progress_entries where id = (select ana_extra_entry from ctx) returning 1
)
select is((select count(*) from removed), 0::bigint, 'outro aluno não apaga registro da aluna');
with removed as (
  delete from public.student_goals where id = (select ana_goal from ctx) returning 1
)
select is((select count(*) from removed), 0::bigint, 'outro aluno não apaga meta da aluna');

-- Exclusão de metas pelas partes.
select pg_temp.login((select ana_id from ctx));
with removed as (
  delete from public.student_goals where id = (select ana_goal from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'aluna apaga a própria meta');

select pg_temp.login((select carla_id from ctx));
with removed as (
  delete from public.progress_entries where id = (select carla_entry from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'aluna sem vínculo apaga o próprio registro');
with removed as (
  delete from public.student_goals where id = (select carla_goal from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'aluna apaga meta de personal antigo');

-- Autoria da última alteração também nas metas.
select pg_temp.login((select ana_id from ctx));
update public.student_goals set target_value = 64.5 where id = (select ana_second_goal from ctx);
select is(
  (select updated_by from public.student_goals where id = (select ana_second_goal from ctx)),
  (select ana_id from ctx),
  'edição de meta registra quem alterou'
);
select throws_ok(
  $$ update public.student_goals set updated_by = (select trainer_id from ctx)
     where id = (select ana_second_goal from ctx) $$,
  '42501', null,
  'cliente não forja o autor da alteração da meta'
);

-- Personal: apaga meta própria com vínculo, não mexe em meta de outro personal nem sem vínculo.
select pg_temp.login((select trainer_id from ctx));
with changed as (
  update public.student_goals set target_value = 65
  where id = (select ana_other_trainer_goal from ctx) returning 1
)
select is((select count(*) from changed), 0::bigint, 'personal não edita meta de outro personal');
with removed as (
  delete from public.student_goals where id = (select ana_other_trainer_goal from ctx) returning 1
)
select is((select count(*) from removed), 0::bigint, 'personal não apaga meta de outro personal');
with removed as (
  delete from public.student_goals where id = (select ana_second_goal from ctx) returning 1
)
select is((select count(*) from removed), 1::bigint, 'personal apaga meta da aluna vinculada');
with changed as (
  update public.progress_entries set weight_kg = 79
  where id = (select bruno_entry from ctx) returning 1
)
select is((select count(*) from changed), 0::bigint, 'personal com vínculo encerrado não edita registro');
with removed as (
  delete from public.student_goals where id = (select bruno_goal from ctx) returning 1
)
select is((select count(*) from removed), 0::bigint, 'personal com vínculo encerrado não apaga meta');

-- Notificações não copiam valores de saúde.
reset role;
update public.trainer_student_relationships
set status = 'active', ended_at = null
where student_id = (select bruno_id from ctx);
insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
select bruno_id, current_date, 81.3, bruno_id from ctx;
select is(
  (select count(*) from public.notifications
   where user_id = (select trainer_id from ctx) and kind = 'progress_recorded'
     and body like '%81%'),
  0::bigint,
  'notificação de progresso não contém o peso'
);
insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
select trainer_id, bruno_id, 'weight'::public.goal_kind, 81.3, 77.7, current_date + 30, trainer_id from ctx;
select is(
  (select count(*) from public.notifications
   where user_id = (select bruno_id from ctx) and kind = 'goal_created'
     and (body like '%77%' or body like '%81%')),
  0::bigint,
  'notificação de meta não contém os valores'
);
select is(
  (select count(*) from public.notifications
   where kind in ('progress_recorded', 'goal_created') and body ~ '[0-9]'),
  0::bigint,
  'nenhuma notificação de progresso ou meta guarda números'
);

select * from finish();
rollback;
