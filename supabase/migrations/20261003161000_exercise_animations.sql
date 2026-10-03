-- GIF animado (WebP) por exercício do catálogo (ADR 0011). A animação fica no
-- bucket exercise-media, em gif-pack/, ao lado de uma miniatura estática que
-- passa a ser a imagem do exercício (image_paths). Retirar o pacote é limpar
-- animation_path e restaurar image_paths, sem tocar em fichas e treinos.

alter table public.exercises add column animation_path text;

alter table public.exercises drop constraint exercise_external_id_by_source;
alter table public.exercises
  add constraint exercise_external_id_by_source check (
    (source in ('exercisedb', 'free_exercise_db', 'gif_pack') and external_id is not null and owner_id is null)
    or (source = 'custom' and external_id is null and owner_id is not null)
  ),
  add constraint exercise_animation_only_in_catalog check (
    animation_path is null or (owner_id is null and animation_path like 'gif-pack/%')
  );

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/webp']
where id = 'exercise-media';

-- A busca devolve a animação e põe primeiro os exercícios animados, para o
-- catálogo padronizado aparecer antes das fotos antigas.
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
    )
  order by
    (exercise.owner_id is not null) desc,
    (custom.exercise_id is not null) desc,
    (normalized.term <> '' and lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) like normalized.term || '%') desc,
    (exercise.animation_path is not null) desc,
    (coalesce(exercise.name_pt, '') like '%(%') asc,
    coalesce(exercise.name_pt, exercise.name_en)
  limit greatest(1, least(result_limit, 100));
$$;

grant execute on function public.search_exercises(text, text, text, integer) to authenticated;

-- O casamento com o Hevy considera todo o catálogo global (owner_id nulo), não
-- uma lista de origens — assim o pacote de GIFs entra sem outra mudança aqui.
create or replace function public.match_or_create_hevy_exercise(
  hevy_template_id text,
  requested_title text,
  target_owner_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached_exercise_id uuid;
  normalized_title text := nullif(btrim(requested_title), '');
  match_threshold constant numeric := 0.70;
  ambiguity_gap constant numeric := 0.05;
  high_confidence constant numeric := 0.85;
  top1 record;
  top2 record;
  matched_exercise_id uuid;
begin
  if normalized_title is null then raise exception 'INVALID_EXERCISE_TITLE'; end if;

  select exercise_id into cached_exercise_id
  from public.hevy_exercise_template_map
  where template_id = hevy_template_id and owner_id = target_owner_id;
  if cached_exercise_id is not null then return cached_exercise_id; end if;

  select exercise.id, extensions.similarity(lower(exercise.name_en), lower(normalized_title)) as score
  into top1
  from public.exercises exercise
  where exercise.retired_at is null
    and (exercise.owner_id is null or exercise.owner_id = target_owner_id)
  order by score desc
  limit 1;

  select exercise.id, extensions.similarity(lower(exercise.name_en), lower(normalized_title)) as score
  into top2
  from public.exercises exercise
  where exercise.retired_at is null
    and (exercise.owner_id is null or exercise.owner_id = target_owner_id)
    and exercise.id <> coalesce(top1.id, '00000000-0000-0000-0000-000000000000'::uuid)
  order by score desc
  limit 1;

  if top1.id is not null and top1.score >= match_threshold
     and (top2.id is null or top1.score - top2.score >= ambiguity_gap or top1.score >= high_confidence)
  then
    matched_exercise_id := top1.id;
  else
    insert into public.exercises (source, external_id, name_en, name_pt, owner_id)
    values ('custom', null, normalized_title, normalized_title, target_owner_id)
    returning id into matched_exercise_id;
  end if;

  insert into public.hevy_exercise_template_map (template_id, owner_id, exercise_id)
  values (hevy_template_id, target_owner_id, matched_exercise_id)
  on conflict (template_id, owner_id) do nothing;

  return matched_exercise_id;
end;
$$;
