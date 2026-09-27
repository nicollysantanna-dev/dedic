-- recompute_workout_records: corrige recordes quando um treino "atrasado" chega
-- com data anterior a um treino já commitado que tinha recorde — cenário que uma
-- sincronização de histórico externo (ex.: Hevy) pode produzir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;
create function pg_temp.log_set(workout uuid, pos integer, kg numeric, reps integer) returns void
language sql as $$
  insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, completed_at)
  select id, pos, kg, reps, now() from public.workout_exercises where workout_id = workout;
$$;

grant select on ctx to authenticated, service_role;
set local role authenticated;
select pg_temp.login((select ana_id from ctx));

-- Treino A (dia 1, nativo): primeira marca do aluno no exercício.
create temporary table workout_a as select public.start_workout(null, null, null, 'A') as id;
select public.add_workout_exercise((select id from workout_a), (select bench_id from ctx));
select pg_temp.log_set((select id from workout_a), 0, 40, 10);
select public.finish_workout((select id from workout_a));

-- Treino B (dia 3, nativo): bate a marca de A. No momento em que é finalizado,
-- A é o único ponto de comparação — o treino C, de um dia intermediário, ainda
-- não existe (chega depois, simulando uma importação de histórico atrasada).
create temporary table workout_b as select public.start_workout(null, null, null, 'B') as id;
select public.add_workout_exercise((select id from workout_b), (select bench_id from ctx));
select pg_temp.log_set((select id from workout_b), 0, 50, 10);
select public.finish_workout((select id from workout_b));

select is(
  (select record_count from public.workouts where id = (select id from workout_b)),
  1,
  'treino B é recorde no momento em que é finalizado, único dado disponível até então'
);

reset role;

-- now() é fixo durante toda a transação do teste, então A e B saíram com o
-- mesmo finished_at (a ordem entre eles ficaria decidida por desempate de uuid).
-- Fixamos datas explícitas e bem separadas para os três treinos, para que a
-- ordem cronológica A → C → B seja determinística no teste.
update public.workouts
set started_at = now() - interval '3 days', finished_at = now() - interval '3 days' + interval '30 minutes'
where id = (select id from workout_a);
update public.workouts
set started_at = now() - interval '1 day', finished_at = now() - interval '1 day' + interval '30 minutes'
where id = (select id from workout_b);

-- Treino C chega depois (simulando import_hevy_workout): finished_at fica entre
-- A e B, com carga maior que as duas. Inserido diretamente, como fará a
-- importação do Hevy — start_workout/finish_workout sempre usam now().
create temporary table workout_c as
with inserted as (
  insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, duration_seconds, recorded_by)
  select
    (select ana_id from ctx), (select trainer_id from ctx), 'C',
    now() - interval '2 days', now() - interval '2 days' + interval '30 minutes',
    1800, (select ana_id from ctx)
  returning id
)
select id from inserted;

create temporary table workout_c_exercise as
with inserted as (
  insert into public.workout_exercises (workout_id, exercise_id, position)
  select (select id from workout_c), (select bench_id from ctx), 0
  returning id
)
select id from inserted;

insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, completed_at)
select
  (select id from workout_c_exercise), 0, 55, 10,
  (select finished_at from public.workouts where id = (select id from workout_c));

select public.apply_workout_records((select id from workout_c));

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from workout_c)),
  array['weight', 'one_rm', 'volume'],
  'treino C, importado depois mas com data intermediária, vira recorde ao ser processado'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from workout_b)),
  array['weight', 'one_rm', 'volume'],
  'treino B ainda mostra o recorde antigo: apply_workout_records de C não o revisita'
);

set local role authenticated;
select throws_ok(
  $$ select public.recompute_workout_records('00000000-0000-4000-8000-000000000002'::uuid) $$,
  '42501',
  null,
  'recompute_workout_records é negado para authenticated'
);
reset role;

set local role service_role;
select public.recompute_workout_records((select ana_id from ctx));
reset role;

select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from workout_b)),
  '{}'::text[],
  'após recompute, treino B perde o recorde: C (data anterior) já tinha superado'
);
select is(
  (select record_count from public.workouts where id = (select id from workout_b)),
  0,
  'contador de recordes do treino B é corrigido para zero'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from workout_c)),
  array['weight', 'one_rm', 'volume'],
  'treino C continua com o recorde após o recompute'
);
select is(
  (select record_kinds from public.workout_sets sets
   join public.workout_exercises we on we.id = sets.workout_exercise_id
   where we.workout_id = (select id from workout_a)),
  array['weight', 'one_rm', 'volume'],
  'treino A (o mais antigo) mantém seu recorde original após o recompute'
);

select * from finish();
rollback;
