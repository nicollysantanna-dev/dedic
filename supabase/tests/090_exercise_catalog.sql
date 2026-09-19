-- Catálogo de exercícios: busca sem acento, apelidos e exercícios personalizados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select trainer_id from ctx));

select ok((select count(*) from public.exercises) >= 1500, 'catálogo importado com 1.500 exercícios');
select ok(
  exists (select 1 from public.search_exercises('supino reto') where name_en = 'barbell bench press'),
  'busca em português encontra o supino'
);
select ok(
  exists (select 1 from public.search_exercises('SUPINO RETO') where name_en = 'barbell bench press'),
  'busca ignora maiúsculas'
);
select ok(
  exists (select 1 from public.search_exercises('bench press') where name_en = 'barbell bench press'),
  'busca em inglês também funciona'
);
select ok(
  not exists (select 1 from public.search_exercises('supino', 'back')),
  'filtro por parte do corpo restringe'
);
select ok(
  exists (select 1 from public.search_exercises('supino', 'chest', 'barbell')),
  'filtro por equipamento combina com a busca'
);

-- Apelido do personal aparece na busca e tem prioridade.
insert into public.exercise_aliases (trainer_id, exercise_id, alias)
select (select trainer_id from ctx), id, 'Supino reto (meu)' from public.exercises
where name_en = 'barbell bench press';
select is(
  (select alias from public.search_exercises('meu') limit 1),
  'Supino reto (meu)',
  'apelido é pesquisável e devolvido'
);

-- Exercício personalizado: visível ao dono e aos alunos vinculados, não a terceiros.
insert into public.exercises (source, owner_trainer_id, name_en, name_pt, body_parts, equipments, target_muscles)
values ('custom', (select trainer_id from ctx), 'Agachamento na caixa (Paula)', 'Agachamento na caixa (Paula)',
        array['upper legs'], array['body weight'], array['quads']);
select throws_ok(
  $$ insert into public.exercises (source, external_id, name_en) values ('exercisedb', 'hack', 'Hack') $$,
  '42501', null,
  'personal não insere no catálogo global'
);

select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from public.exercises where source = 'custom'),
  1::bigint,
  'aluna vinculada vê o exercício personalizado do personal'
);
select is(
  (select count(*) from public.exercise_aliases),
  1::bigint,
  'aluna vinculada vê o apelido do personal'
);
select throws_ok(
  $$ insert into public.exercises (source, owner_trainer_id, name_en) values ('custom', (select ana_id from ctx), 'x') $$,
  '42501', null,
  'aluna não cria exercícios'
);

select pg_temp.login((select carla_id from ctx));
select is(
  (select count(*) from public.exercises where source = 'custom'),
  0::bigint,
  'aluna sem vínculo não vê exercícios personalizados'
);

select * from finish();
rollback;
