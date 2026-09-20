-- Foto do aparelho por exercício, cadastrada pelo personal e visível aos alunos
-- vinculados. Fica junto do apelido (personalização do personal por exercício).

alter table public.exercise_aliases alter column alias drop not null;
alter table public.exercise_aliases add column photo_path text;
alter table public.exercise_aliases
  add constraint alias_or_photo_required check (alias is not null or photo_path is not null);
alter table public.exercise_aliases
  add constraint photo_path_belongs_to_trainer check (
    photo_path is null or photo_path like trainer_id::text || '/%'
  );

-- Fotos de aparelhos não são dados pessoais: bucket público, servido pelo CDN.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-photos', 'exercise-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy exercise_photos_trainer_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'exercise-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'trainer')
);

create policy exercise_photos_trainer_update
on storage.objects for update
to authenticated
using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy exercise_photos_trainer_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy exercise_photos_public_read
on storage.objects for select
to public
using (bucket_id = 'exercise-photos');

-- A busca passa a devolver a foto do personal (a do próprio, ou a do personal
-- vinculado quando quem busca é o aluno).
drop function public.search_exercises(text, text, text, integer);

create or replace function public.search_exercises(
  search_term text default '',
  body_part text default null,
  equipment text default null,
  result_limit integer default 40
)
returns table (
  id uuid,
  source public.exercise_source,
  external_id text,
  name_en text,
  name_pt text,
  alias text,
  photo_path text,
  body_parts text[],
  equipments text[],
  target_muscles text[],
  secondary_muscles text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with normalized as (
    select lower(extensions.unaccent(coalesce(search_term, ''))) as term
  ),
  viewer_trainer as (
    -- Personal usa as próprias personalizações; aluno usa as do personal vinculado.
    select coalesce(
      (select id from public.profiles where id = auth.uid() and role = 'trainer'),
      (select relationship.trainer_id from public.trainer_student_relationships relationship
       where relationship.student_id = auth.uid() and relationship.status = 'active' limit 1)
    ) as trainer_id
  )
  select
    exercise.id, exercise.source, exercise.external_id, exercise.name_en, exercise.name_pt,
    custom.alias, custom.photo_path, exercise.body_parts, exercise.equipments,
    exercise.target_muscles, exercise.secondary_muscles
  from public.exercises exercise
  cross join normalized
  cross join viewer_trainer
  left join public.exercise_aliases custom
    on custom.exercise_id = exercise.id and custom.trainer_id = viewer_trainer.trainer_id
  where (body_part is null or body_part = any(exercise.body_parts))
    and (equipment is null or equipment = any(exercise.equipments))
    and (
      normalized.term = ''
      or lower(extensions.unaccent(coalesce(exercise.name_pt, ''))) like '%' || normalized.term || '%'
      or lower(exercise.name_en) like '%' || normalized.term || '%'
      or lower(extensions.unaccent(coalesce(custom.alias, ''))) like '%' || normalized.term || '%'
    )
  order by
    (custom.exercise_id is not null) desc,
    (exercise.owner_trainer_id is not null) desc,
    (normalized.term <> '' and lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) like normalized.term || '%') desc,
    (coalesce(exercise.name_pt, '') like '%(%') asc,
    coalesce(exercise.name_pt, exercise.name_en)
  limit greatest(1, least(result_limit, 100));
$$;

grant execute on function public.search_exercises(text, text, text, integer) to authenticated;
