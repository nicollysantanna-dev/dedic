-- Catálogo de exercícios: busca sem acento, apelidos, exercícios próprios e fotos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

select ok(
  (select count(*) from public.exercises where source = 'free_exercise_db') >= 870,
  'catálogo free-exercise-db importado'
);
select is(
  (select count(*) from public.exercises where source = 'exercisedb' and retired_at is null),
  0::bigint,
  'catálogo antigo não fica ativo'
);
select ok(
  exists (select 1 from public.search_exercises('supino reto') where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  'busca em português encontra o supino'
);
select ok(
  exists (select 1 from public.search_exercises('SUPINO RETO') where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  'busca ignora maiúsculas'
);
select ok(
  exists (select 1 from public.search_exercises('bench press') where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  'busca em inglês também funciona'
);
select is(
  (select array_length(image_paths, 1) from public.search_exercises('supino reto')
   where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  2,
  'busca devolve as imagens do catálogo'
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
where external_id = 'Barbell_Bench_Press_-_Medium_Grip';
select is(
  (select alias from public.search_exercises('meu') limit 1),
  'Supino reto (meu)',
  'apelido é pesquisável e devolvido'
);

-- Exercício próprio do personal: visível ao dono e aos alunos vinculados, não a terceiros.
insert into public.exercises (source, owner_id, name_en, name_pt, body_parts, equipments, target_muscles)
values ('custom', (select trainer_id from ctx), 'Agachamento na caixa (Paula)', 'Agachamento na caixa (Paula)',
        array['upper legs'], array['body weight'], array['quads']);
select throws_ok(
  $$ insert into public.exercises (source, external_id, name_en) values ('free_exercise_db', 'hack', 'Hack') $$,
  '42501', null,
  'personal não insere no catálogo global'
);

-- Foto do aparelho: cada um envia na própria pasta; aluna vinculada vê na busca.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('exercise-photos', (select trainer_id from ctx)::text || '/supino.jpg', (select trainer_id from ctx)::text) $$,
  'personal envia foto do aparelho na própria pasta'
);
update public.exercise_aliases set photo_path = (select trainer_id from ctx)::text || '/supino.jpg'
where trainer_id = (select trainer_id from ctx);
select is(
  (select photo_path from public.search_exercises('meu') limit 1),
  (select trainer_id from ctx)::text || '/supino.jpg',
  'busca do personal devolve a foto'
);

select pg_temp.login((select ana_id from ctx));
select is(
  (select photo_path from public.search_exercises('meu') limit 1),
  (select trainer_id from ctx)::text || '/supino.jpg',
  'aluna vinculada vê apelido e foto do personal na busca'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('exercise-photos', (select trainer_id from ctx)::text || '/x.jpg', (select ana_id from ctx)::text) $$,
  '42501', null,
  'aluna não envia foto na pasta de outra pessoa'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('exercise-photos', (select ana_id from ctx)::text || '/leg.jpg', (select ana_id from ctx)::text) $$,
  'aluna envia foto do aparelho na própria pasta'
);
select is(
  (select count(*) from public.exercises where source = 'custom'),
  1::bigint,
  'aluna vinculada vê o exercício próprio do personal'
);
select is(
  (select count(*) from public.exercise_aliases),
  1::bigint,
  'aluna vinculada vê o apelido do personal'
);

-- Exercício próprio da aluna, com foto: ela cria, o personal vinculado vê, terceiros não.
select lives_ok(
  $$ insert into public.exercises (source, owner_id, name_en, name_pt, photo_path)
     values ('custom', (select ana_id from ctx), 'Leg press da academia', 'Leg press da academia',
             (select ana_id from ctx)::text || '/leg.jpg') $$,
  'aluna cria exercício próprio com foto'
);
select is(
  (select photo_path from public.search_exercises('leg press da academia') limit 1),
  (select ana_id from ctx)::text || '/leg.jpg',
  'busca devolve a foto do exercício próprio'
);

select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.exercises where owner_id = (select ana_id from ctx)),
  1::bigint,
  'personal vinculado vê o exercício próprio da aluna'
);

select pg_temp.login((select carla_id from ctx));
select is(
  (select count(*) from public.exercises where source = 'custom'),
  0::bigint,
  'aluna sem vínculo não vê exercícios próprios de ninguém'
);

select * from finish();
rollback;
