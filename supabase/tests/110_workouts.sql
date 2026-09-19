-- Sessões de treino: início pela ficha, pré-preenchimento pelo histórico,
-- edição enquanto aberta, finalização imutável, isolamento e notificação.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  (select id from public.exercises where name_en = 'barbell bench press') as bench_id,
  (select id from public.exercises where name_en = 'barbell full squat') as squat_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated;
set local role authenticated;

-- Ficha da Ana com supino (2 séries) e agachamento (1 série).
select pg_temp.login((select trainer_id from ctx));
create temporary table routine as
select public.save_routine(jsonb_build_object(
  'name', 'Treino A', 'student_id', (select ana_id from ctx),
  'exercises', jsonb_build_array(
    jsonb_build_object('exercise_id', (select bench_id from ctx), 'rest_seconds', 90,
      'sets', jsonb_build_array(jsonb_build_object('weight_kg', 40, 'reps', 12), jsonb_build_object('weight_kg', 45, 'reps', 10))),
    jsonb_build_object('exercise_id', (select squat_id from ctx), 'sets', jsonb_build_array(jsonb_build_object('weight_kg', 60, 'reps', 10)))
  )
)) as id;

-- Aluna inicia a sessão pela ficha.
select pg_temp.login((select ana_id from ctx));
create temporary table session as select public.start_workout((select id from routine)) as id;
select is(
  (select count(*) from public.workout_exercises where workout_id = (select id from session)),
  2::bigint,
  'sessão copia os exercícios da ficha'
);
select is(
  (select weight_kg from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from session) and we.position = 0 and sets.position = 1),
  45::numeric,
  'sem histórico, a série vem com a carga-alvo da ficha'
);
select throws_like(
  $$ select public.start_workout((select id from routine)) $$,
  '%WORKOUT_ALREADY_OPEN%',
  'aluna não abre duas sessões ao mesmo tempo'
);

-- Registra as séries: conclui as duas do supino com carga maior; o agachamento fica em branco.
update public.workout_sets sets
set weight_kg = 50, reps = 10, completed_at = now()
from public.workout_exercises we
where we.id = sets.workout_exercise_id and we.workout_id = (select id from session) and we.position = 0;
select is(
  (select count(*) from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from session) and sets.completed_at is not null),
  2::bigint,
  'aluna marca séries como concluídas'
);
select lives_ok(
  $$ insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, completed_at)
     select id, 2, 50, 8, now() from public.workout_exercises
     where workout_id = (select id from session) and position = 0 $$,
  'aluna adiciona uma série extra'
);

-- Personal vinculado também edita e adiciona exercício durante a aula.
select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ select public.add_workout_exercise((select id from session), (select bench_id from ctx)) $$,
  'personal adiciona exercício à sessão aberta'
);

-- Outro aluno não vê nem edita.
select pg_temp.login((select bruno_id from ctx));
select is((select count(*) from public.workouts), 0::bigint, 'outro aluno não vê a sessão');
select throws_like(
  $$ select public.finish_workout((select id from session)) $$,
  '%WORKOUT_NOT_EDITABLE%',
  'outro aluno não finaliza a sessão'
);

-- Finalização: séries vazias somem, exercício sem séries some, duração calculada, personal notificado.
select pg_temp.login((select ana_id from ctx));
select lives_ok($$ select public.finish_workout((select id from session), 'Bom treino') $$, 'aluna finaliza');
select is(
  (select count(*) from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from session)),
  3::bigint,
  'só as séries concluídas permanecem'
);
select is(
  (select count(*) from public.workout_exercises where workout_id = (select id from session)),
  1::bigint,
  'exercícios sem séries concluídas são removidos'
);
select ok(
  (select finished_at is not null and duration_seconds >= 0 from public.workouts where id = (select id from session)),
  'sessão finalizada com duração'
);
with changed as (
  update public.workout_sets sets set reps = 99
  from public.workout_exercises we
  where we.id = sets.workout_exercise_id and we.workout_id = (select id from session)
  returning 1
)
select is((select count(*) from changed), 0::bigint, 'sessão finalizada é imutável');
select throws_like(
  $$ select public.finish_workout((select id from session)) $$,
  '%WORKOUT_NOT_EDITABLE%',
  'finalizar de novo é recusado'
);

select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.notifications where kind = 'workout_finished'),
  1::bigint,
  'personal é notificado do treino finalizado pela aluna'
);

-- Nova sessão: o "anterior" vem do histórico (50 kg × 10), não mais da ficha.
select pg_temp.login((select ana_id from ctx));
create temporary table second as select public.start_workout((select id from routine)) as id;
select is(
  (select previous_weight_kg from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from second) and we.position = 0 and sets.position = 0),
  50::numeric,
  'série pré-preenchida com a última carga registrada'
);
select is(
  (select previous_weight_kg from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from second) and we.position = 1 and sets.position = 0),
  null,
  'exercício nunca executado não tem anterior'
);

-- Finalizar sem nenhuma série concluída é recusado; descartar libera a aluna.
select throws_like(
  $$ select public.finish_workout((select id from second)) $$,
  '%WORKOUT_HAS_NO_COMPLETED_SETS%',
  'sessão vazia não pode ser finalizada'
);
select lives_ok($$ select public.discard_workout((select id from second)) $$, 'aluna descarta a sessão');
select lives_ok(
  $$ select public.start_workout(null, null, null, 'Treino livre') $$,
  'após descartar, uma nova sessão livre pode começar'
);

select * from finish();
rollback;
