-- match_or_create_hevy_exercise casava exercícios diferentes com nomes
-- parecidos em português (muita palavra em comum: "Cadeira", "(Máquina)",
-- "Halter", "Cabo"...) — ex.: "Cadeira Abdutora (Máquina)" foi confundida com
-- "Cadeira Flexora (Máquina)" (máquinas diferentes, treinam grupos
-- musculares diferentes), similaridade 0.57, acima do limiar antigo de 0.40.
-- Comparado com variações genuinamente próximas do mesmo exercício
-- ("Barbell Bench Press - Medium Grip" vs "...Gripp", 0.91; "Remada Curvada
-- máquina" vs "Remada Curvada (Máquina)", 1.0), há folga confortável para
-- subir o limiar sem perder esses casos. Errar para o lado de criar um
-- custom a mais (cosmético, já é um risco aceito pela ADR 0007) é bem melhor
-- que fundir dois exercícios diferentes em um só (corrompe histórico).
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
    and (
      exercise.source in ('exercisedb', 'free_exercise_db')
      or (exercise.source = 'custom' and exercise.owner_id = target_owner_id)
    )
  order by score desc
  limit 1;

  select exercise.id, extensions.similarity(lower(exercise.name_en), lower(normalized_title)) as score
  into top2
  from public.exercises exercise
  where exercise.retired_at is null
    and (
      exercise.source in ('exercisedb', 'free_exercise_db')
      or (exercise.source = 'custom' and exercise.owner_id = target_owner_id)
    )
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
