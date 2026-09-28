-- match_or_create_hevy_exercise não deve fundir exercícios diferentes que só
-- compartilham palavras genéricas em português (ex.: "Cadeira ... (Máquina)").
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

create temporary table ctx as
select '00000000-0000-4000-8000-000000000002'::uuid as ana_id;

grant select on ctx to service_role;
set local role service_role;

create temporary table flexora as
select public.match_or_create_hevy_exercise(
  'hevy-tpl-flexora', 'Cadeira Flexora (Máquina)', (select ana_id from ctx)
) as exercise_id;

create temporary table abdutora as
select public.match_or_create_hevy_exercise(
  'hevy-tpl-abdutora', 'Cadeira Abdutora (Máquina)', (select ana_id from ctx)
) as exercise_id;

reset role;

select isnt(
  (select exercise_id from flexora),
  (select exercise_id from abdutora),
  'exercícios diferentes com nome parecido não são fundidos'
);
select is(
  (select name_pt from public.exercises where id = (select exercise_id from abdutora)),
  'Cadeira Abdutora (Máquina)',
  'exercício sem correspondência confiável vira custom com o próprio nome'
);

-- Variação de pontuação/grafia do mesmo exercício continua casando (não deve
-- virar custom por causa do limiar mais alto).
set local role service_role;
create temporary table remada_a as
select public.match_or_create_hevy_exercise(
  'hevy-tpl-remada-a', 'Remada Curvada máquina', (select ana_id from ctx)
) as exercise_id;
create temporary table remada_b as
select public.match_or_create_hevy_exercise(
  'hevy-tpl-remada-b', 'Remada Curvada (Máquina)', (select ana_id from ctx)
) as exercise_id;
reset role;

select is(
  (select exercise_id from remada_a),
  (select exercise_id from remada_b),
  'variação de pontuação do mesmo exercício continua casando'
);

select * from finish();
rollback;
