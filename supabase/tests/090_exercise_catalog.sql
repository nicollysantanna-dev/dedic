-- Catálogo de exercícios: busca sem acento, apelidos, exercícios próprios e fotos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

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
-- Catálogo só com GIF animado 3D (ADR 0012).
select ok(
  not exists (select 1 from public.search_exercises('windmill avançado')
              where external_id = 'Advanced_Kettlebell_Windmill'),
  'exercício só com fotos sai da busca'
);
select ok(
  not exists (
    select 1 from public.exercises
    where owner_id is null and retired_at is null
      and (animation_path is null or exists (
        select 1 from unnest(image_paths) as path where path not like 'gif-pack/%'
      ))
  ),
  'catálogo ativo só tem GIF animado e miniatura do pacote'
);
select is(
  (select name_pt from public.search_exercises('agachamento livre com barra') limit 1),
  'Agachamento livre',
  'nome da duplicata com foto leva à versão com GIF'
);
select ok(
  exists (select 1 from public.exercises
          where external_id = 'Barbell_Squat' and retired_at is not null),
  'versão com foto aposentada continua existindo para fichas antigas'
);

-- Pacote de GIFs (ADR 0011): exercícios novos e animação nos casados.
select ok(
  (select count(*) from public.exercises where source = 'gif_pack' and retired_at is null) >= 300,
  'exercícios do pacote de GIFs importados'
);
select ok(
  not exists (
    select 1 from public.exercises
    where source = 'gif_pack' and (animation_path is null or array_length(image_paths, 1) <> 1)
  ),
  'todo exercício do pacote tem animação e miniatura'
);
select is(
  (select animation_path from public.search_exercises('supino reto')
   where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  'gif-pack/barbell-bench-press.webp',
  'exercício casado ganha a animação'
);
select is(
  (select image_paths from public.search_exercises('supino reto')
   where external_id = 'Barbell_Bench_Press_-_Medium_Grip'),
  array['gif-pack/barbell-bench-press.thumb.webp'],
  'miniatura do GIF substitui as fotos do exercício casado'
);
select is(
  (select animation_path from public.search_exercises('leg press horizontal', 'upper legs', 'leverage machine')
   where external_id = 'gif-pack:horizontal-leg-press'),
  'gif-pack/horizontal-leg-press.webp',
  'exercício novo do pacote aparece na busca com filtro e animação'
);

-- Nomes dos personais: sinônimo global, nome anterior e duplicatas aposentadas.
select is(
  (select name_pt from public.search_exercises('extensao de quadril na polia') limit 1),
  'Coice na polia',
  'sinônimo leva ao mesmo exercício'
);
select is(
  (select name_pt from public.search_exercises('rotação russa') limit 1),
  'Russian twist',
  'nome anterior continua encontrando o exercício renomeado'
);
select is(
  (select name_pt from public.search_exercises('agachamento livre') limit 1),
  'Agachamento livre',
  'agachamento livre é o com barra, antes da versão sem peso'
);
select ok(
  not exists (select 1 from public.search_exercises('desenvolvimento com halteres')
              where external_id = 'Dumbbell_Shoulder_Press'),
  'versão com foto duplicada sai da busca'
);
select is(
  (select count(*) from (
    select name_pt from public.exercises
    where owner_id is null and retired_at is null
    group by name_pt having count(*) > 1
  ) duplicated),
  0::bigint,
  'nenhum nome repetido no catálogo ativo'
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
select throws_ok(
  $$ insert into public.exercises (source, external_id, name_en) values ('gif_pack', 'gif-pack:hack', 'Hack') $$,
  '42501', null,
  'personal não insere no pacote de GIFs'
);
select throws_ok(
  $$ update public.exercises set animation_path = 'gif-pack/outro.webp'
     where owner_id = (select trainer_id from ctx) $$,
  '23514', null,
  'exercício próprio não recebe animação do pacote'
);
reset role;
select throws_ok(
  $$ update public.exercises set retired_at = null where external_id = 'Barbell_Squat' $$,
  '23514', null,
  'catálogo global não reativa exercício sem animação'
);
set local role authenticated;

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
