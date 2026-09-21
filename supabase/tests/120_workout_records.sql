-- Recordes por exercício: gravados ao finalizar, vista de recordes, histórico de
-- carga, treinos no resumo de atividade e meta de carga.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;
create function pg_temp.log_set(workout uuid, pos integer, kg numeric, reps integer) returns void
language sql as $$
  insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, completed_at)
  select id, pos, kg, reps, now() from public.workout_exercises where workout_id = workout;
$$;

grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select ana_id from ctx));

-- Primeiro treino: 40×12 e 50×8. A primeira série é recorde em tudo; a segunda
-- bate carga e 1RM (63,3 > 56), mas não o volume (400 < 480).
create temporary table first as select public.start_workout(null, null, null, 'Peito') as id;
select public.add_workout_exercise((select id from first), (select bench_id from ctx));
select pg_temp.log_set((select id from first), 0, 40, 12);
select pg_temp.log_set((select id from first), 1, 50, 8);
select public.finish_workout((select id from first));

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from first) and sets.position = 0),
  array['weight', 'one_rm', 'volume'],
  'primeira série de um exercício novo é recorde em carga, 1RM e volume'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from first) and sets.position = 1),
  array['weight', 'one_rm'],
  'série seguinte só marca o que superou'
);
select is(
  (select record_count from public.workouts where id = (select id from first)),
  2,
  'treino guarda quantas séries bateram recorde'
);
select is(
  (select (best_weight_kg, best_one_rm, best_volume) from public.exercise_records
   where student_id = (select ana_id from ctx) and exercise_id = (select bench_id from ctx)),
  (50::numeric, 63.3::numeric, 480::numeric),
  'vista de recordes consolida carga, 1RM e volume'
);

-- Segundo treino: 45×10 não bate nada; 55×5 bate carga e 1RM, não volume.
create temporary table second as select public.start_workout(null, null, null, 'Peito 2') as id;
select public.add_workout_exercise((select id from second), (select bench_id from ctx));
select pg_temp.log_set((select id from second), 0, 45, 10);
select pg_temp.log_set((select id from second), 1, 55, 5);
select public.finish_workout((select id from second));

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from second) and sets.position = 0),
  '{}'::text[],
  'série abaixo do melhor anterior não é recorde'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from second) and sets.position = 1),
  array['weight', 'one_rm'],
  'recorde compara com treinos anteriores finalizados'
);
select is(
  (select count(*) from public.exercise_workout_stats
   where student_id = (select ana_id from ctx) and exercise_id = (select bench_id from ctx)),
  2::bigint,
  'histórico de carga tem uma linha por treino'
);
select is(
  (select max_weight_kg from public.exercise_workout_stats
   where workout_id = (select id from second)),
  55::numeric,
  'histórico traz a maior carga do treino'
);

-- Série de aquecimento não conta como recorde.
create temporary table third as select public.start_workout(null, null, null, 'Peito 3') as id;
select public.add_workout_exercise((select id from third), (select bench_id from ctx));
insert into public.workout_sets (workout_exercise_id, position, set_type, weight_kg, reps, completed_at)
select id, 0, 'warmup', 100, 1, now() from public.workout_exercises where workout_id = (select id from third);
select public.finish_workout((select id from third));
select is(
  (select record_count from public.workouts where id = (select id from third)),
  0,
  'aquecimento não gera recorde'
);
select is(
  (select best_weight_kg from public.exercise_records
   where student_id = (select ana_id from ctx) and exercise_id = (select bench_id from ctx)),
  55::numeric,
  'aquecimento não entra nos recordes'
);

-- Resumo de atividade do personal conta os treinos.
select pg_temp.login((select trainer_id from ctx));
select is(
  (select workouts_30d from public.student_activity_summary where student_id = (select ana_id from ctx)),
  3,
  'resumo de atividade conta treinos finalizados nos últimos 30 dias'
);
select is(
  (select count(*) from public.notifications where kind = 'workout_finished' and body like '%recorde%'),
  2::bigint,
  'notificação ao personal menciona os recordes'
);

-- Meta de carga exige o exercício.
select throws_ok(
  $$ insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
     values ((select trainer_id from ctx), (select ana_id from ctx), 'exercise_load', 50, 70, current_date + 60, (select trainer_id from ctx)) $$,
  '23514', null,
  'meta de carga sem exercício é recusada'
);
select lives_ok(
  $$ insert into public.student_goals (trainer_id, student_id, kind, exercise_id, initial_value, target_value, target_date, created_by)
     values ((select trainer_id from ctx), (select ana_id from ctx), 'exercise_load', (select bench_id from ctx), 50, 70, current_date + 60, (select trainer_id from ctx)) $$,
  'personal define meta de carga para o supino'
);

select * from finish();
rollback;
