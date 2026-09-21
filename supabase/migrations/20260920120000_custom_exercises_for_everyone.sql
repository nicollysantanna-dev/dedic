-- Troca de catálogo (ExerciseDB → free-exercise-db, com imagens no nosso bucket),
-- exercícios próprios para aluno e personal (com foto do aparelho), e
-- substituição de exercício em sessão aberta.

alter table public.exercises rename column owner_trainer_id to owner_id;
alter table public.exercises drop constraint exercise_external_id_by_source;
alter table public.exercises
  add column photo_path text,
  add column instructions text[] not null default '{}',
  add column image_paths text[] not null default '{}',
  add column retired_at timestamptz;
alter table public.exercises
  add constraint exercise_external_id_by_source check (
    (source in ('exercisedb', 'free_exercise_db') and external_id is not null and owner_id is null)
    or (source = 'custom' and external_id is null and owner_id is not null)
  ),
  add constraint exercise_photo_belongs_to_owner check (
    photo_path is null or (owner_id is not null and photo_path like owner_id::text || '/%')
  );

drop policy exercises_select on public.exercises;
drop policy exercises_trainer_insert on public.exercises;
drop policy exercises_trainer_update on public.exercises;

-- Catálogo: todos. Próprio: o dono e quem tem vínculo ativo com o dono (nas duas direções).
create policy exercises_select
on public.exercises for select
to authenticated
using (
  owner_id is null
  or owner_id = (select auth.uid())
  or exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.status = 'active'
      and (
        (relationship.trainer_id = exercises.owner_id and relationship.student_id = (select auth.uid()))
        or (relationship.student_id = exercises.owner_id and relationship.trainer_id = (select auth.uid()))
      )
  )
);

create policy exercises_owner_insert
on public.exercises for insert
to authenticated
with check (source = 'custom' and owner_id = (select auth.uid()));

create policy exercises_owner_update
on public.exercises for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()) and source = 'custom');

-- Imagens do catálogo: bucket público, preenchido por scripts/sync-exercise-media.mjs
-- com a chave de serviço (ninguém escreve pelo app).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

create policy exercise_media_public_read
on storage.objects for select
to public
using (bucket_id = 'exercise-media');

-- Fotos de aparelho: qualquer usuário autenticado na própria pasta.
drop policy exercise_photos_trainer_upload on storage.objects;
drop policy exercise_photos_trainer_update on storage.objects;
drop policy exercise_photos_trainer_delete on storage.objects;

create policy exercise_photos_owner_upload
on storage.objects for insert
to authenticated
with check (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy exercise_photos_owner_update
on storage.objects for update
to authenticated
using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy exercise_photos_owner_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- A busca devolve imagens do catálogo, a foto do próprio exercício (quando
-- personalizado) ou a do personal, e esconde exercícios aposentados.
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
  image_paths text[],
  instructions text[],
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
    select coalesce(
      (select id from public.profiles where id = auth.uid() and role = 'trainer'),
      (select relationship.trainer_id from public.trainer_student_relationships relationship
       where relationship.student_id = auth.uid() and relationship.status = 'active' limit 1)
    ) as trainer_id
  )
  select
    exercise.id, exercise.source, exercise.external_id, exercise.name_en, exercise.name_pt,
    custom.alias, coalesce(exercise.photo_path, custom.photo_path), exercise.image_paths,
    exercise.instructions, exercise.body_parts, exercise.equipments, exercise.target_muscles, exercise.secondary_muscles
  from public.exercises exercise
  cross join normalized
  cross join viewer_trainer
  left join public.exercise_aliases custom
    on custom.exercise_id = exercise.id and custom.trainer_id = viewer_trainer.trainer_id
  where exercise.retired_at is null
    and (body_part is null or body_part = any(exercise.body_parts))
    and (equipment is null or equipment = any(exercise.equipments))
    and (
      normalized.term = ''
      or lower(extensions.unaccent(coalesce(exercise.name_pt, ''))) like '%' || normalized.term || '%'
      or lower(exercise.name_en) like '%' || normalized.term || '%'
      or lower(extensions.unaccent(coalesce(custom.alias, ''))) like '%' || normalized.term || '%'
    )
  order by
    (exercise.owner_id is not null) desc,
    (custom.exercise_id is not null) desc,
    (normalized.term <> '' and lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) like normalized.term || '%') desc,
    (coalesce(exercise.name_pt, '') like '%(%') asc,
    coalesce(exercise.name_pt, exercise.name_en)
  limit greatest(1, least(result_limit, 100));
$$;

grant execute on function public.search_exercises(text, text, text, integer) to authenticated;

-- Substituir o exercício de uma sessão aberta mantendo as séries.
create or replace function public.replace_workout_exercise(
  target_workout_exercise_id uuid,
  target_exercise_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_exercise public.workout_exercises;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into workout_exercise from public.workout_exercises where id = target_workout_exercise_id;
  if workout_exercise.id is null then raise exception 'WORKOUT_EXERCISE_NOT_FOUND'; end if;
  if not public.can_edit_workout(workout_exercise.workout_id) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;
  if not exists (
    select 1 from public.exercises where id = target_exercise_id and retired_at is null
  ) then
    raise exception 'EXERCISE_NOT_FOUND';
  end if;
  update public.workout_exercises set exercise_id = target_exercise_id
  where id = target_workout_exercise_id;
end;
$$;

revoke all on function public.replace_workout_exercise(uuid, uuid) from public;
grant execute on function public.replace_workout_exercise(uuid, uuid) to authenticated;
