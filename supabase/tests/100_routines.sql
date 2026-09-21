-- Fichas: salvamento atômico, atribuição com vínculo, leitura pelo aluno, cópia e arquivamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id,
  (select id from public.exercises where external_id = 'Barbell_Squat') as squat_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;
create function pg_temp.routine_json(student uuid, routine_id uuid default null) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', routine_id, 'name', 'Treino A', 'notes', 'Foco em peito e pernas', 'student_id', student,
    'exercises', jsonb_build_array(
      jsonb_build_object('exercise_id', (select bench_id from ctx), 'rest_seconds', 90, 'notes', 'Cotovelos a 45°',
        'sets', jsonb_build_array(
          jsonb_build_object('weight_kg', 40, 'reps', 12),
          jsonb_build_object('weight_kg', 50, 'reps', 10),
          jsonb_build_object('weight_kg', 50, 'reps', 8))),
      jsonb_build_object('exercise_id', (select squat_id from ctx), 'rest_seconds', 120,
        'sets', jsonb_build_array(jsonb_build_object('weight_kg', 60, 'reps', 10)))
    )
  );
$$;

grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select trainer_id from ctx));

create temporary table saved as
select public.save_routine(pg_temp.routine_json((select ana_id from ctx))) as routine_id;
select is(
  (select count(*) from public.routine_exercises where routine_id = (select routine_id from saved)),
  2::bigint,
  'ficha salva com os exercícios em ordem'
);
select is(
  (select count(*) from public.routine_sets sets
   join public.routine_exercises re on re.id = sets.routine_exercise_id
   where re.routine_id = (select routine_id from saved)),
  4::bigint,
  'séries-alvo individuais gravadas'
);
-- Regravar substitui exercícios e séries de forma atômica, sem notificar de novo.
select lives_ok(
  $$ select public.save_routine(pg_temp.routine_json((select ana_id from ctx), (select routine_id from saved))) $$,
  'editar a ficha regrava tudo'
);
select is(
  (select count(*) from public.routine_exercises where routine_id = (select routine_id from saved)),
  2::bigint,
  'edição não duplica exercícios'
);

select throws_like(
  $$ select public.save_routine(pg_temp.routine_json((select carla_id from ctx))) $$,
  '%ACTIVE_RELATIONSHIP_REQUIRED%',
  'ficha não pode ser atribuída a aluna sem vínculo'
);
select throws_like(
  $$ select public.save_routine('{"name":"Vazia","exercises":[]}'::jsonb) $$,
  '%ROUTINE_NEEDS_EXERCISES%',
  'ficha precisa de exercícios'
);
select throws_ok(
  $$ insert into public.routines (trainer_id, name) values ((select trainer_id from ctx), 'Direto') $$,
  '42501', null,
  'não há escrita direta em fichas'
);

-- Cópia como modelo e arquivamento.
create temporary table copied as
select public.duplicate_routine((select routine_id from saved)) as routine_id;
select is(
  (select count(*) from public.routine_sets sets
   join public.routine_exercises re on re.id = sets.routine_exercise_id
   where re.routine_id = (select routine_id from copied)),
  4::bigint,
  'cópia preserva as séries'
);
select lives_ok(
  $$ select public.archive_routine((select routine_id from copied)) $$,
  'personal arquiva a cópia'
);

-- Aluna lê só a própria ficha; Bruno e Carla não veem nada.
select pg_temp.login((select ana_id from ctx));
select is((select count(*) from public.routines), 1::bigint, 'aluna vê a ficha atribuída a ela');
select is(
  (select count(*) from public.notifications where kind = 'routine_assigned'),
  1::bigint,
  'aluna foi notificada uma única vez (edição sem trocar aluno não repete)'
);
-- Aluna cria a própria ficha (dona), não edita a do personal, e o personal vê a dela.
create temporary table own as
select public.save_routine(pg_temp.routine_json((select ana_id from ctx))) as routine_id;
select is(
  (select created_by from public.routines where id = (select routine_id from own)),
  (select ana_id from ctx),
  'aluna cria a própria ficha'
);
select is(
  (select trainer_id from public.routines where id = (select routine_id from own)),
  (select trainer_id from ctx),
  'ficha da aluna referencia o personal vinculado'
);
select lives_ok(
  $$ select public.save_routine(pg_temp.routine_json((select ana_id from ctx), (select routine_id from saved))) $$,
  'aluna edita a ficha criada pelo personal para ela'
);
select is(
  (select created_by from public.routines where id = (select routine_id from saved)),
  (select trainer_id from ctx),
  'edição pela aluna preserva a autoria original'
);
select lives_ok(
  $$ select public.duplicate_routine((select routine_id from saved)) $$,
  'aluna copia a ficha do personal para si'
);
select is((select count(*) from public.notifications where kind = 'routine_assigned'), 1::bigint,
  'ficha criada pela própria aluna não gera notificação');
select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.routines where created_by = (select ana_id from ctx)),
  2::bigint,
  'personal vê as fichas criadas pela aluna'
);
select lives_ok(
  $$ select public.save_routine(pg_temp.routine_json((select ana_id from ctx), (select routine_id from own))) $$,
  'personal edita a ficha criada pela aluna'
);
select lives_ok(
  $$ select public.archive_routine((select routine_id from own)) $$,
  'personal arquiva a ficha criada pela aluna'
);
select pg_temp.login((select bruno_id from ctx));
select throws_like(
  $$ select public.save_routine(pg_temp.routine_json((select bruno_id from ctx), (select routine_id from saved))) $$,
  '%ROUTINE_NOT_FOUND%',
  'aluno de fora não edita a ficha'
);
select pg_temp.login((select bruno_id from ctx));
select is((select count(*) from public.routine_sets), 0::bigint, 'outro aluno não vê séries de fichas alheias');

select * from finish();
rollback;
