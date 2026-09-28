-- generate_routines_from_history só considera os últimos 60 dias: duas
-- sessões com o mesmo nome espalhadas ao longo de quase um ano (coincidência,
-- não rotina real) não devem virar ficha.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  (select id from public.exercises where external_id = 'Barbell_Bench_Press_-_Medium_Grip') as bench_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated, service_role;

set local role service_role;
-- Uma sessão "Segunda" há quase um ano, outra há 10 dias: mesmo nome, sem
-- relação real de rotina recorrente.
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-old-1',
  jsonb_build_object(
    'name', 'Segunda', 'started_at', now() - interval '340 days',
    'finished_at', now() - interval '340 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(jsonb_build_object('type', 'normal', 'weight_kg', 40, 'reps', 10))
    ))
  )
);
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-recent-1',
  jsonb_build_object(
    'name', 'Segunda', 'started_at', now() - interval '10 days',
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
select is(
  (select count(*) from gen1),
  0::bigint,
  'só uma ocorrência dentro dos últimos 60 dias não vira ficha (coincidência antiga não conta)'
);

-- Uma terceira sessão "Segunda" recente faz o padrão passar a valer.
set local role service_role;
select public.import_hevy_workout(
  (select ana_id from ctx), 'gen-recent-2',
  jsonb_build_object(
    'name', 'Segunda', 'started_at', now() - interval '3 days',
    'finished_at', now() - interval '3 days' + interval '30 minutes',
    'exercises', jsonb_build_array(jsonb_build_object(
      'template_id', 'bench', 'title', 'Barbell Bench Press - Medium Grip',
      'sets', jsonb_build_array(jsonb_build_object('type', 'normal', 'weight_kg', 40, 'reps', 10))
    ))
  )
);
reset role;

set local role authenticated;
select pg_temp.login((select ana_id from ctx));
create temporary table gen2 as select * from public.generate_routines_from_history();
select is(
  (select count(*) from gen2),
  1::bigint,
  'duas ocorrências recentes (dentro de 60 dias) já viram ficha'
);

select * from finish();
rollback;
