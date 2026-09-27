-- Limite de fotos de evolução por aluno (enforce_progress_photo_limit).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select ana_id from ctx));

-- Preenche até o limite (60) direto pela tabela, sem passar pelo Storage —
-- só o contador do trigger importa aqui.
insert into storage.objects (bucket_id, name, owner_id)
select
  'progress-photos',
  (select ana_id from ctx)::text || '/foto-' || generate_series || '.jpg',
  (select ana_id from ctx)::text
from generate_series(1, 60);

insert into public.progress_photos (student_id, taken_on, position, storage_path)
select
  (select ana_id from ctx),
  current_date,
  'front',
  (select ana_id from ctx)::text || '/foto-' || generate_series || '.jpg'
from generate_series(1, 60);

select is(
  (select count(*) from public.progress_photos where student_id = (select ana_id from ctx)),
  60::bigint,
  'aluna preenche as 60 fotos permitidas'
);

select throws_like(
  $$ insert into public.progress_photos (student_id, taken_on, position, storage_path)
     values ((select ana_id from ctx), current_date, 'front',
             (select ana_id from ctx)::text || '/foto-61.jpg') $$,
  '%PHOTO_LIMIT_REACHED%',
  'a 61ª foto é recusada'
);

-- Excluir uma foto libera espaço (o contador só considera deleted_at is null).
select lives_ok(
  $$ select public.delete_progress_photo(
       (select id from public.progress_photos
        where student_id = (select ana_id from ctx)
        order by created_at limit 1)
     ) $$,
  'aluna exclui uma foto antiga'
);
select lives_ok(
  $$ insert into public.progress_photos (student_id, taken_on, position, storage_path)
     values ((select ana_id from ctx), current_date, 'front',
             (select ana_id from ctx)::text || '/foto-61.jpg') $$,
  'depois de excluir, aluna envia outra foto normalmente'
);

-- O limite é por aluno: outro aluno com zero fotos não é afetado.
select pg_temp.login((select bruno_id from ctx));
insert into storage.objects (bucket_id, name, owner_id)
values ('progress-photos', (select bruno_id from ctx)::text || '/foto-1.jpg', (select bruno_id from ctx)::text);
select lives_ok(
  $$ insert into public.progress_photos (student_id, taken_on, position, storage_path)
     values ((select bruno_id from ctx), current_date, 'front',
             (select bruno_id from ctx)::text || '/foto-1.jpg') $$,
  'limite de outro aluno não é compartilhado'
);

select * from finish();
rollback;
