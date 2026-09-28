-- generate_routines_from_history: transforma nome de treino que se repete em
-- ficha, usando a sessão mais recente como molde; atualiza em vez de
-- duplicar; respeita ficha arquivada; nunca gera para outro aluno.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id,
  (select id from public.exercises where external_id = 'Barbell_Squat') as squat_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated, service_role;

-- Um treino batizado uma única vez não deve virar ficha.
set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-solo',
  jsonb_build_object(
    'name', 'Treino único', 'started_at', now() - interval '10 days',
    'finished_at', now() - interval '10 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(jsonb_build_object('type', 'normal', 'weight_kg', 40, 'reps', 10))
    ))
  )
);
reset role;

set local role authenticated;
select pg_temp.login((select ana_id from ctx));
create temporary table gen1 as select * from public.generate_routines_from_history();
select is((select count(*) from gen1), 0::bigint, 'treino batizado uma vez não vira ficha');

-- "Quarta" repete duas vezes, com exercícios diferentes: a mais antiga com
-- supino, a mais recente com agachamento — a ficha deve refletir a mais
-- recente.
set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-quarta-1',
  jsonb_build_object(
    'name', 'Quarta', 'started_at', now() - interval '14 days',
    'finished_at', now() - interval '14 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(jsonb_build_object('type', 'normal', 'weight_kg', 40, 'reps', 10))
    ))
  )
);
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-quarta-2',
  jsonb_build_object(
    'name', 'Quarta', 'started_at', now() - interval '7 days',
    'finished_at', now() - interval '7 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'squat', 'title', 'Barbell Squat',
      'sets', jsonb_build_array(
        jsonb_build_object('type', 'normal', 'weight_kg', 60, 'reps', 8),
        jsonb_build_object('type', 'warmup', 'weight_kg', 20, 'reps', 12)
      )
    ))
  )
);
reset role;

set local role authenticated;
select pg_temp.login((select ana_id from ctx));
create temporary table gen2 as select * from public.generate_routines_from_history();
select is((select count(*) from gen2), 1::bigint, 'ficha criada a partir do padrão "Quarta"');
select is((select status from gen2 limit 1), 'created', 'primeira geração marca como criada');
select is(
  (select re.exercise_id from public.routine_exercises re
   where re.routine_id = (select routine_id from gen2 limit 1)),
  (select squat_id from ctx),
  'ficha usa os exercícios da sessão mais recente, não da mais antiga'
);
select is(
  (select count(*) from public.routine_sets rs
   join public.routine_exercises re on re.id = rs.routine_exercise_id
   where re.routine_id = (select routine_id from gen2 limit 1)),
  1::bigint,
  'série de aquecimento não vira série-alvo'
);

-- Rodar de novo sem mudar o histórico: mesma ficha, não duplica.
create temporary table gen3 as select * from public.generate_routines_from_history();
select is(
  (select routine_id from gen3 limit 1),
  (select routine_id from gen2 limit 1),
  'gerar de novo reaproveita a mesma ficha'
);
select is((select status from gen3 limit 1), 'updated', 'segunda geração marca como atualizada');
select is(
  (select count(*) from public.routines where student_id = (select ana_id from ctx) and name = 'Quarta'),
  1::bigint,
  'não duplica ficha para o mesmo nome de treino'
);

-- Isolamento: outro aluno não recebe nada do padrão da Ana.
select pg_temp.login((select bruno_id from ctx));
create temporary table gen_bruno as select * from public.generate_routines_from_history();
select is((select count(*) from gen_bruno), 0::bigint, 'outro aluno não gera fichas a partir do histórico alheio');

-- Aluna arquiva a ficha gerada; gerar de novo respeita a decisão (não
-- desarquiva, não duplica).
select pg_temp.login((select ana_id from ctx));
select public.archive_routine((select routine_id from gen2 limit 1));
create temporary table gen4 as select * from public.generate_routines_from_history();
select is((select status from gen4 limit 1), 'skipped', 'ficha arquivada é pulada, não recriada');
select is(
  (select count(*) from public.routines where student_id = (select ana_id from ctx) and name = 'Quarta'),
  1::bigint,
  'ficha arquivada continua única (não duplicou)'
);
select is(
  (select archived_at is not null from public.routines
   where id = (select routine_id from gen2 limit 1)),
  true,
  'gerar de novo não desarquiva a ficha'
);

select * from finish();
rollback;
