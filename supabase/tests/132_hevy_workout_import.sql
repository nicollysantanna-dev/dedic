-- import_hevy_workout: idempotente, casa exercícios, mapeia tipos de série
-- desconhecidos e produz recordes com a mesma paridade do fluxo nativo
-- (finish_workout), desde que os treinos sejam importados em ordem cronológica.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated, service_role;

-- Três treinos, do mais antigo para o mais novo, com as mesmas cargas do teste
-- de recordes do fluxo nativo (120_workout_records.sql), para provar paridade:
-- o import deve produzir exatamente os mesmos recordes que finish_workout.
set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'hevy-a',
  jsonb_build_object(
    'name', 'A', 'started_at', now() - interval '3 days', 'finished_at', now() - interval '3 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'hevy-bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(
        jsonb_build_object('type', 'normal', 'weight_kg', 40, 'reps', 12),
        jsonb_build_object('type', 'normal', 'weight_kg', 50, 'reps', 8)
      )
    ))
  )
);
reset role;

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-a') and sets.position = 0),
  array['weight', 'one_rm', 'volume'],
  'treino A importado: primeira série é recorde em tudo, igual ao fluxo nativo'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-a') and sets.position = 1),
  array['weight', 'one_rm'],
  'treino A importado: segunda série só marca o que superou'
);
select is(
  (select record_count from public.workouts where id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-a')),
  2,
  'treino A importado guarda quantas séries bateram recorde'
);

set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'hevy-b',
  jsonb_build_object(
    'name', 'B', 'started_at', now() - interval '1 day', 'finished_at', now() - interval '1 day' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'hevy-bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(
        jsonb_build_object('type', 'normal', 'weight_kg', 45, 'reps', 10),
        jsonb_build_object('type', 'normal', 'weight_kg', 55, 'reps', 5)
      )
    ))
  )
);
reset role;

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-b') and sets.position = 0),
  '{}'::text[],
  'treino B importado: série abaixo do melhor anterior não é recorde'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-b') and sets.position = 1),
  array['weight', 'one_rm'],
  'treino B importado: recorde compara com o histórico já importado'
);
select is(
  (select record_count from public.workouts where id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-b')),
  1,
  'treino B importado guarda o total correto de recordes'
);

-- Aquecimento e um tipo de série desconhecido do Hevy: nenhum quebra o import;
-- o tipo desconhecido cai em 'normal', mas carga baixa não vira recorde.
set local role service_role;
select lives_ok(
  $$ select public.import_hevy_workout(
    '00000000-0000-4000-8000-000000000002'::uuid, 'hevy-c',
    jsonb_build_object(
      'name', 'C', 'started_at', now(), 'finished_at', now() + interval '30 minutes',
      'exercises', jsonb_build_array(jsonb_build_object(
        'template_id', 'hevy-bench', 'title', 'Barbell Bench Press - Medium Grip',
        'sets', jsonb_build_array(
          jsonb_build_object('type', 'warmup', 'weight_kg', 100, 'reps', 1),
          jsonb_build_object('type', 'dropset', 'weight_kg', 1, 'reps', 1)
        )
      ))
    )
  ) $$,
  'aquecimento e tipo de série desconhecido não quebram a importação'
);
select is(
  public.import_hevy_workout((select ana_id from ctx), 'hevy-a', '{}'::jsonb),
  (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-a'),
  'reimportar o mesmo treino retorna o workout_id existente'
);
reset role;

select is(
  (select record_count from public.workouts where id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-c')),
  0,
  'aquecimento e série de carga baixa (tipo desconhecido → normal) não geram recorde'
);
select is(
  (select count(*) from public.workouts where student_id = (select ana_id from ctx)),
  3::bigint,
  'nenhum treino duplicado foi criado ao reimportar'
);

-- exercise_records e student_activity_summary já refletem os treinos
-- importados, sem nenhum código de frontend novo.
set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select is(
  (select best_weight_kg from public.exercise_records
   where student_id = (select ana_id from ctx) and exercise_id = (select bench_id from ctx)),
  55::numeric,
  'exercise_records reflete a maior carga entre os treinos importados'
);
reset role;

set local role authenticated;
select pg_temp.login((select trainer_id from ctx));
select ok(
  (select workouts_30d from public.student_activity_summary where student_id = (select ana_id from ctx)) >= 3,
  'resumo de atividade do personal conta os treinos importados'
);
reset role;

set local role authenticated;
select pg_temp.login((select ana_id from ctx));
select throws_ok(
  $$ select public.import_hevy_workout('00000000-0000-4000-8000-000000000002'::uuid, 'hevy-x', '{}'::jsonb) $$,
  '42501',
  null,
  'import_hevy_workout é negado para authenticated'
);
reset role;

-- Treino D chega depois, com data entre A e B: sem recompute, o recorde de B
-- (já importado) fica desatualizado; com recompute, é corrigido.
set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'hevy-d',
  jsonb_build_object(
    'name', 'D', 'started_at', now() - interval '2 days', 'finished_at', now() - interval '2 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'hevy-bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(jsonb_build_object('type', 'normal', 'weight_kg', 60, 'reps', 5))
    ))
  )
);
reset role;

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-b') and sets.position = 1),
  array['weight', 'one_rm'],
  'treino B ainda mostra o recorde antigo logo após D ser importado'
);

set local role service_role;
select public.recompute_workout_records((select ana_id from ctx));
reset role;

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select workout_id from public.hevy_workout_imports where hevy_workout_id = 'hevy-b') and sets.position = 1),
  '{}'::text[],
  'após recompute, treino B perde o recorde superado por D (data anterior)'
);

select * from finish();
rollback;
