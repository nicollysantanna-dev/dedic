-- Fotos de evolução no Storage seguem a situação da foto (ativa ou excluída).
-- Uma foto excluída pela aluna não pode continuar legível pelo personal, mesmo que o
-- arquivo ainda exista no bucket.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Fixtures como superusuário: uma foto que será excluída e uma que permanece ativa.
create temporary table photos as
with inserted as (
  insert into public.progress_photos (student_id, taken_on, position, storage_path)
  values
    ((select ana_id from ctx), current_date, 'front',
     (select ana_id from ctx)::text || '/excluida.jpg'),
    ((select ana_id from ctx), current_date, 'side',
     (select ana_id from ctx)::text || '/ativa.jpg')
  returning id, storage_path
)
select * from inserted;

insert into storage.objects (bucket_id, name)
select 'progress-photos', storage_path from photos;

grant select on ctx, photos to authenticated;
grant select on storage.objects to authenticated;
set local role authenticated;

-- Antes da exclusão: a aluna e a personal vinculada enxergam as duas fotos.
select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like (select ana_id from ctx)::text || '/%'),
  2::bigint,
  'aluna enxerga as duas fotos de evolução no Storage'
);

select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like (select ana_id from ctx)::text || '/%'),
  2::bigint,
  'personal ativo enxerga as fotos de evolução da aluna'
);

select pg_temp.login((select bruno_id from ctx));
select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like (select ana_id from ctx)::text || '/%'),
  0::bigint,
  'aluno sem vínculo não enxerga fotos de evolução de outra pessoa'
);

-- A aluna exclui uma foto pelo caminho oficial (RPC). O arquivo não é removido aqui de propósito:
-- o teste garante que o banco esconde a foto excluída mesmo com o objeto ainda no bucket.
select pg_temp.login((select ana_id from ctx));
select public.delete_progress_photo(
  (select id from photos where storage_path like '%/excluida.jpg')
);

select pg_temp.login((select trainer_id from ctx));
select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like '%/excluida.jpg'),
  0::bigint,
  'personal não enxerga foto de evolução excluída pela aluna'
);

select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like '%/excluida.jpg'),
  0::bigint,
  'aluna também não enxerga a foto que excluiu'
);

select is(
  (select count(*) from storage.objects
   where bucket_id = 'progress-photos' and name like '%/ativa.jpg'),
  1::bigint,
  'foto que continua ativa segue visível para a aluna'
);

select * from finish();
rollback;
