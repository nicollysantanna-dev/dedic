-- Evolução editável: aluno e personal vinculado editam e apagam registros e metas do aluno.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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
  '72000000-0000-4000-8000-000000000002'::uuid as carla_goal;

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
select carla_goal, trainer_id, carla_id, 'weight'::public.goal_kind, 60, 58, current_date + 90, trainer_id from ctx;

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

select * from finish();
rollback;
