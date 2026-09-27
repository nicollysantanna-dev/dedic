-- match_or_create_hevy_exercise: casa por nome aproximado ou cria um exercício
-- custom; cacheia por (template_id, owner_id); exclusivo de service_role.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id;

grant select on ctx to service_role, authenticated;

set local role service_role;

select is(
  public.match_or_create_hevy_exercise('hevy-tpl-exact', 'Barbell Bench Press - Medium Grip', (select ana_id from ctx)),
  (select bench_id from ctx),
  'título idêntico casa com o exercício do catálogo'
);
select is(
  public.match_or_create_hevy_exercise('hevy-tpl-near', 'Barbell Bench Press - Medium Gripp', (select ana_id from ctx)),
  (select bench_id from ctx),
  'título parecido casa por similaridade, com folga sobre variações próximas'
);

create temporary table nonsense_result as
select public.match_or_create_hevy_exercise(
  'hevy-tpl-nonsense', 'Exercício Inventado Sem Correspondência 12345', (select ana_id from ctx)
) as exercise_id;

reset role;
select is(
  (select exercise_id from nonsense_result),
  (
    select id from public.exercises
    where source = 'custom' and owner_id = (select ana_id from ctx)
      and name_en = 'Exercício Inventado Sem Correspondência 12345'
  ),
  'título sem correspondência cria um exercício custom'
);
select is(
  (select source from public.exercises
   where owner_id = (select ana_id from ctx) and name_en = 'Exercício Inventado Sem Correspondência 12345'),
  'custom',
  'exercício criado tem source custom'
);
set local role service_role;

select is(
  (select count(*) from public.hevy_exercise_template_map
   where template_id = 'hevy-tpl-nonsense' and owner_id = (select ana_id from ctx)),
  1::bigint,
  'mapeamento fica em cache após criar o custom'
);
select is(
  public.match_or_create_hevy_exercise(
    'hevy-tpl-nonsense', 'Título diferente não importa mais', (select ana_id from ctx)
  ),
  (
    select exercise_id from public.hevy_exercise_template_map
    where template_id = 'hevy-tpl-nonsense' and owner_id = (select ana_id from ctx)
  ),
  'chamada repetida com o mesmo template_id usa o cache, não cria outro custom'
);

reset role;
select is(
  (select count(*) from public.exercises
   where source = 'custom' and owner_id = (select ana_id from ctx)),
  1::bigint,
  'nenhum custom duplicado foi criado'
);
set local role authenticated;
select throws_ok(
  $$ select public.match_or_create_hevy_exercise('x', 'y', '00000000-0000-4000-8000-000000000002'::uuid) $$,
  '42501',
  null,
  'match_or_create_hevy_exercise é negado para authenticated'
);
reset role;

select * from finish();
rollback;
