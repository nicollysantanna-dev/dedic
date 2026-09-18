-- Evolução física: metas, registros e fotos restritos ao aluno e ao personal vinculado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  '10000000-0000-4000-8000-000000000002'::uuid as bruno_relationship_id,
  '70000000-0000-4000-8000-000000000001'::uuid as photo_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated;
set local role authenticated;

-- Aluna registra peso; personal registra medidas para a aluna.
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
     values ((select ana_id from ctx), current_date, 68.4, (select ana_id from ctx)) $$,
  'aluna registra o próprio peso'
);
select throws_ok(
  $$ insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
     values ((select bruno_id from ctx), current_date, 80, (select ana_id from ctx)) $$,
  '42501', null,
  'aluna não registra peso de outro aluno'
);
select throws_ok(
  $$ delete from public.progress_entries where student_id = (select ana_id from ctx) $$,
  '42501', null,
  'registros de progresso não podem ser apagados pelo cliente'
);

select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ insert into public.progress_entries (student_id, recorded_on, measurements, recorded_by)
     values ((select ana_id from ctx), current_date, '{"waist_cm": 74}', (select trainer_id from ctx)) $$,
  'personal registra medidas da aluna vinculada'
);
select throws_ok(
  $$ insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
     values ((select carla_id from ctx), current_date, 60, (select trainer_id from ctx)) $$,
  '42501', null,
  'personal não registra progresso de aluna sem vínculo'
);
select is(
  (select count(*) from public.progress_entries where student_id = (select ana_id from ctx)),
  2::bigint,
  'personal lê os registros da aluna vinculada'
);

-- Metas: só o personal cria e altera; a aluna lê.
select lives_ok(
  $$ insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
     values ((select trainer_id from ctx), (select ana_id from ctx), 'weight', 68.4, 64, current_date + 90, (select trainer_id from ctx)) $$,
  'personal define meta de peso'
);
select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from public.student_goals where status = 'active'),
  1::bigint,
  'aluna vê a própria meta'
);
select throws_ok(
  $$ insert into public.student_goals (trainer_id, student_id, kind, initial_value, target_value, target_date, created_by)
     values ((select trainer_id from ctx), (select ana_id from ctx), 'weight', 68, 60, current_date + 30, (select ana_id from ctx)) $$,
  '42501', null,
  'aluna não cria metas'
);
with changed as (update public.student_goals set status = 'achieved' returning 1)
select is((select count(*) from changed), 0::bigint, 'aluna não altera metas');

-- Fotos: aluna envia (metadado + objeto), personal vê, outro aluno não.
select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('progress-photos', (select ana_id from ctx)::text || '/foto-1.jpg', (select ana_id from ctx)::text) $$,
  'aluna envia arquivo na própria pasta'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('progress-photos', (select bruno_id from ctx)::text || '/invasao.jpg', (select ana_id from ctx)::text) $$,
  '42501', null,
  'aluna não envia arquivo na pasta de outro aluno'
);
select lives_ok(
  $$ insert into public.progress_photos (id, student_id, taken_on, position, storage_path)
     values ((select photo_id from ctx), (select ana_id from ctx), current_date, 'front',
             (select ana_id from ctx)::text || '/foto-1.jpg') $$,
  'aluna registra o metadado da foto'
);

select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.progress_photos),
  1::bigint,
  'personal vinculado vê a foto'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'progress-photos'),
  1::bigint,
  'personal vinculado lê o arquivo'
);

select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from public.progress_photos),
  0::bigint,
  'outro aluno não vê a foto'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'progress-photos'),
  0::bigint,
  'outro aluno não lê o arquivo'
);

-- Exclusão pelo aluno remove arquivo e oculta o metadado.
select throws_like(
  $$ select public.delete_progress_photo((select photo_id from ctx)) $$,
  '%STUDENT_REQUIRED%',
  'outro aluno não exclui a foto'
);
select pg_temp.login((select ana_id from ctx));
-- A remoção do arquivo só é permitida pela Storage API (coberta no E2E).
select lives_ok(
  $$ select public.delete_progress_photo((select photo_id from ctx)) $$,
  'aluna oculta a própria foto'
);
select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from public.progress_photos),
  0::bigint,
  'foto excluída deixa de aparecer para o personal'
);

select * from finish();
rollback;
