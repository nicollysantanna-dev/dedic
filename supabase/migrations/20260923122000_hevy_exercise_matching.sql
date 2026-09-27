-- Casamento de exercícios do Hevy com o catálogo do Dedic: cache por aluno +
-- template do Hevy, e uma função de match aproximado (por nome) que cria um
-- exercício custom quando não há correspondência confiável o suficiente.

create table public.hevy_exercise_template_map (
  template_id text not null,
  owner_id uuid not null references public.profiles (id),
  exercise_id uuid not null references public.exercises (id),
  created_at timestamptz not null default now(),
  primary key (template_id, owner_id)
);

alter table public.hevy_exercise_template_map enable row level security;

create policy hevy_exercise_template_map_select_own
on public.hevy_exercise_template_map for select
to authenticated
using (owner_id = (select auth.uid()));

grant select on public.hevy_exercise_template_map to authenticated, service_role;

-- Casa (ou cria) um exercício do catálogo para um exercício do Hevy. Só
-- service_role: roda dentro da sincronização, não é ação direta do usuário.
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
  match_threshold constant numeric := 0.40;
  ambiguity_gap constant numeric := 0.05;
  high_confidence constant numeric := 0.80;
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

revoke all on function public.match_or_create_hevy_exercise(text, text, uuid) from public;
grant execute on function public.match_or_create_hevy_exercise(text, text, uuid) to service_role;
