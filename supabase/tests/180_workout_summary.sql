-- Resumo do treino para o card pós-treino: semana batida, medalhas, recordes e meta padrão 5.
-- Tudo roda numa transação, então now() é igual para todos os treinos finalizados aqui;
-- o desempate de "primeiro treino do dia" é pela ordem de início.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  (select id from public.exercises order by id limit 1) as exercise_a,
  (select id from public.exercises order by id offset 1 limit 1) as exercise_b;
grant select on ctx to authenticated, service_role;

create temporary table ids (key text primary key, id uuid);
grant select on ids to authenticated, service_role;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Treino já finalizado (direto, sem passar por finish_workout).
create function pg_temp.done(student uuid, day date, hour integer, author uuid) returns uuid
language sql as $$
  insert into public.workouts (student_id, name, started_at, finished_at, recorded_by)
  values (student, 'Treino', ((day + make_time(hour, 0, 0)) at time zone 'America/Sao_Paulo'),
          ((day + make_time(hour, 0, 0)) at time zone 'America/Sao_Paulo') + interval '1 hour', author)
  returning id;
$$;

-- Treino aberto, para finalizar com finish_workout.
create function pg_temp.open(student uuid, day date, hour integer) returns uuid
language sql as $$
  insert into public.workouts (student_id, name, started_at, recorded_by)
  values (student, 'Treino', ((day + make_time(hour, 0, 0)) at time zone 'America/Sao_Paulo'), student)
  returning id;
$$;

-- Uma série concluída de um exercício.
create function pg_temp.set(workout uuid, exercise uuid, weight numeric, reps integer) returns void
language sql as $$
  with created as (
    insert into public.workout_exercises (workout_id, exercise_id, position)
    select workout, exercise, count(*) from public.workout_exercises where workout_id = workout
    returning id
  )
  insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps, completed_at)
  select id, 0, weight, reps, now() from created;
$$;

create function pg_temp.summary(key text) returns jsonb language sql as $$
  select public.workout_summary((select id from ids where ids.key = summary.key));
$$;

-- Meta padrão.
select is(public.weekly_check_in_target((select ana_id from ctx)), 5,
  'sem meta de frequência, a meta semanal padrão é 5');

-- Ana, semana de 07/09: quatro dias com treino e o quinto finalizado agora.
select pg_temp.done(ana_id, d, 9, ana_id) from ctx,
  unnest(array[date '2026-09-07', date '2026-09-08', date '2026-09-09', date '2026-09-10']) as d;
insert into ids select 'ana_sexta', pg_temp.open(ana_id, date '2026-09-11', 9) from ctx;
select pg_temp.set((select id from ids where key = 'ana_sexta'), exercise_a, 20, 10) from ctx;
select pg_temp.set((select id from ids where key = 'ana_sexta'), exercise_a, 25, 8) from ctx;
select pg_temp.login((select ana_id from ctx));
select public.finish_workout((select id from ids where key = 'ana_sexta'));

select is((pg_temp.summary('ana_sexta') -> 'week' ->> 'met_now')::boolean, true,
  'treino que leva a semana à meta é semana batida');
select is((pg_temp.summary('ana_sexta') -> 'week' ->> 'check_ins')::integer, 5,
  'check-ins da semana até o dia do treino');
select is((pg_temp.summary('ana_sexta') -> 'week' ->> 'target')::integer, 5,
  'meta padrão aparece no resumo');
select is((pg_temp.summary('ana_sexta') ->> 'sets')::integer, 2, 'séries concluídas');
select is((pg_temp.summary('ana_sexta') ->> 'volume_kg')::numeric, 400::numeric,
  'volume é carga × repetições das séries concluídas');
select is((pg_temp.summary('ana_sexta') ->> 'recorded_by_student')::boolean, true,
  'treino finalizado pela própria aluna');

-- Segundo treino no mesmo dia não comemora de novo.
-- now() é igual na transação inteira: as medalhas que a Ana já tem vão para o passado,
-- para que só uma medalha concedida por este treino possa aparecer como nova.
update public.student_achievements set earned_at = earned_at - interval '1 day'
where student_id = (select ana_id from ctx);
insert into ids select 'ana_sexta_tarde', pg_temp.open(ana_id, date '2026-09-11', 18) from ctx;
select pg_temp.set((select id from ids where key = 'ana_sexta_tarde'), exercise_a, 10, 10) from ctx;
select public.finish_workout((select id from ids where key = 'ana_sexta_tarde'));
select is((pg_temp.summary('ana_sexta_tarde') -> 'week' ->> 'met_now')::boolean, false,
  'segundo treino no mesmo dia não é semana batida');
select is(pg_temp.summary('ana_sexta_tarde') -> 'new_achievements', '[]'::jsonb,
  'medalhas de treinos anteriores não aparecem como novas');

-- Ana, semana de 21/09: aula concluída no mesmo dia do treino que completaria a meta.
select pg_temp.done(ana_id, d, 9, ana_id) from ctx,
  unnest(array[date '2026-09-21', date '2026-09-22', date '2026-09-23', date '2026-09-24']) as d;
insert into public.appointments (
  trainer_id, student_id, relationship_id, package_id, starts_at, ends_at,
  status, booking_request_id, created_by
)
select trainer_id, ana_id,
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  timestamp '2026-09-25 07:00' at time zone 'America/Sao_Paulo',
  timestamp '2026-09-25 08:00' at time zone 'America/Sao_Paulo', 'completed',
  gen_random_uuid(), trainer_id
from ctx;
insert into ids select 'ana_dia_de_aula', pg_temp.open(ana_id, date '2026-09-25', 18) from ctx;
select pg_temp.set((select id from ids where key = 'ana_dia_de_aula'), exercise_a, 10, 10) from ctx;
select public.finish_workout((select id from ids where key = 'ana_dia_de_aula'));
select is((pg_temp.summary('ana_dia_de_aula') -> 'week' ->> 'check_ins')::integer, 5,
  'a semana chega a 5 check-ins no dia da aula');
select is((pg_temp.summary('ana_dia_de_aula') -> 'week' ->> 'met_now')::boolean, false,
  'treino em dia que já tinha aula concluída não é semana batida');

-- Treino registrado pelo personal.
insert into ids select 'ana_pelo_personal', pg_temp.done(ana_id, date '2026-09-02', 9, trainer_id) from ctx;
select is((pg_temp.summary('ana_pelo_personal') ->> 'recorded_by_student')::boolean, false,
  'treino registrado pelo personal');

-- Bruno: primeiro treino da conta e meta de frequência 4.
insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
select trainer_id, bruno_id, 'attendance', 0, 4, current_date + 30, trainer_id from ctx;
insert into ids select 'bruno_primeiro', pg_temp.open(bruno_id, date '2026-09-01', 9) from ctx;
select pg_temp.set((select id from ids where key = 'bruno_primeiro'), exercise_a, 10, 10) from ctx;
select pg_temp.login((select bruno_id from ctx));
select public.finish_workout((select id from ids where key = 'bruno_primeiro'));
select ok(pg_temp.summary('bruno_primeiro') -> 'new_achievements' ? 'first_check_in',
  'medalha concedida ao finalizar aparece como nova');
select is((pg_temp.summary('bruno_primeiro') -> 'week' ->> 'target')::integer, 4,
  'meta de frequência ativa prevalece sobre a padrão');

-- Carla: recorde que supera marca anterior conta; recorde de estreia não.
select pg_temp.set(pg_temp.done(carla_id, date '2026-09-01', 9, carla_id), exercise_a, 20, 10) from ctx;
insert into ids select 'carla_recorde', pg_temp.open(carla_id, date '2026-09-03', 9) from ctx;
select pg_temp.set((select id from ids where key = 'carla_recorde'), exercise_a, 30, 10) from ctx;
select pg_temp.set((select id from ids where key = 'carla_recorde'), exercise_b, 10, 10) from ctx;
select pg_temp.login((select carla_id from ctx));
select public.finish_workout((select id from ids where key = 'carla_recorde'));
select is((pg_temp.summary('carla_recorde') ->> 'records')::integer, 1,
  'só conta recorde que supera marca anterior');

-- Autorização e treino aberto.
select pg_temp.login((select bruno_id from ctx));
select throws_ok($$ select pg_temp.summary('ana_sexta') $$, 'WORKOUT_ACCESS_DENIED',
  'aluno sem vínculo não lê o resumo de outro aluno');
insert into ids select 'carla_aberto', pg_temp.open(carla_id, date '2026-09-04', 9) from ctx;
select pg_temp.login((select carla_id from ctx));
select throws_ok($$ select pg_temp.summary('carla_aberto') $$, 'WORKOUT_NOT_FINISHED',
  'treino aberto não tem resumo');

select * from finish();
rollback;
