-- Sinônimos globais do catálogo (ADR 0011): outros nomes do mesmo exercício
-- ("Avanço" para "Passada") e o nome anterior quando o catálogo é renomeado
-- para o vocabulário dos personais. Diferente de exercise_aliases, que é o
-- apelido de um personal, o sinônimo vale para todos e só entra por migração.

alter table public.exercises add column synonyms text[] not null default '{}';

-- A busca também encontra pelos sinônimos (sem acento, em qualquer posição) e
-- põe primeiro o nome exato — principal ou sinônimo —, para "rotação russa"
-- trazer o Russian twist antes de "Rotação russa com pés elevados".
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
  animation_path text,
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
    exercise.animation_path, exercise.instructions, exercise.body_parts, exercise.equipments,
    exercise.target_muscles, exercise.secondary_muscles
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
      or lower(extensions.unaccent(array_to_string(exercise.synonyms, ' | '))) like '%' || normalized.term || '%'
    )
  order by
    (exercise.owner_id is not null) desc,
    (custom.exercise_id is not null) desc,
    (normalized.term <> '' and (
      lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) = normalized.term
      or exists (
        select 1 from unnest(exercise.synonyms) as synonym
        where lower(extensions.unaccent(synonym)) = normalized.term
      )
    )) desc,
    (normalized.term <> '' and lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) like normalized.term || '%') desc,
    (exercise.animation_path is not null) desc,
    (coalesce(exercise.name_pt, '') like '%(%') asc,
    coalesce(exercise.name_pt, exercise.name_en)
  limit greatest(1, least(result_limit, 100));
$$;
