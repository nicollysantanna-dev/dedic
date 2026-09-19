-- T1: catálogo de exercícios (ExerciseDB gratuito + exercícios do personal) e apelidos.
-- Guardamos só identificador, nome e classificação; GIF e instruções vêm da API ao vivo.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.exercise_source as enum ('exercisedb', 'custom');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  source public.exercise_source not null,
  external_id text,
  name_en text not null check (char_length(trim(name_en)) between 2 and 120),
  name_pt text check (name_pt is null or char_length(trim(name_pt)) between 2 and 120),
  body_parts text[] not null default '{}',
  equipments text[] not null default '{}',
  target_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  owner_trainer_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint exercise_external_id_by_source check (
    (source = 'exercisedb' and external_id is not null and owner_trainer_id is null)
    or (source = 'custom' and external_id is null and owner_trainer_id is not null)
  )
);

create unique index exercises_external_id_idx
  on public.exercises (external_id) where external_id is not null;
create index exercises_name_pt_trgm_idx
  on public.exercises using gin (name_pt extensions.gin_trgm_ops);
create index exercises_name_en_trgm_idx
  on public.exercises using gin (name_en extensions.gin_trgm_ops);
create index exercises_owner_idx on public.exercises (owner_trainer_id);

create table public.exercise_aliases (
  trainer_id uuid not null references public.profiles (id),
  exercise_id uuid not null references public.exercises (id),
  alias text not null check (char_length(trim(alias)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trainer_id, exercise_id)
);

create trigger exercise_aliases_set_updated_at
before update on public.exercise_aliases
for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.exercise_aliases enable row level security;

-- Catálogo é público para usuários autenticados; personalizados só para o dono
-- e para os alunos com vínculo ativo com ele.
create policy exercises_select
on public.exercises for select
to authenticated
using (
  owner_trainer_id is null
  or owner_trainer_id = (select auth.uid())
  or exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = exercises.owner_trainer_id
      and relationship.student_id = (select auth.uid())
      and relationship.status = 'active'
  )
);

create policy exercises_trainer_insert
on public.exercises for insert
to authenticated
with check (
  source = 'custom'
  and owner_trainer_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'trainer')
);

create policy exercises_trainer_update
on public.exercises for update
to authenticated
using (owner_trainer_id = (select auth.uid()))
with check (owner_trainer_id = (select auth.uid()) and source = 'custom');

create policy aliases_select_involved
on public.exercise_aliases for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = exercise_aliases.trainer_id
      and relationship.student_id = (select auth.uid())
      and relationship.status = 'active'
  )
);

create policy aliases_trainer_write
on public.exercise_aliases for all
to authenticated
using (trainer_id = (select auth.uid()))
with check (trainer_id = (select auth.uid()));

grant select, insert, update on public.exercises to authenticated;
grant select, insert, update, delete on public.exercise_aliases to authenticated;

-- Busca sem acento e por prefixo de palavra em PT ou EN, respeitando o RLS
-- (security_invoker) e devolvendo o apelido do personal quando existir.
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
  )
  select
    exercise.id, exercise.source, exercise.external_id, exercise.name_en, exercise.name_pt,
    alias.alias, exercise.body_parts, exercise.equipments, exercise.target_muscles,
    exercise.secondary_muscles
  from public.exercises exercise
  cross join normalized
  left join public.exercise_aliases alias
    on alias.exercise_id = exercise.id and alias.trainer_id = auth.uid()
  where (body_part is null or body_part = any(exercise.body_parts))
    and (equipment is null or equipment = any(exercise.equipments))
    and (
      normalized.term = ''
      or lower(extensions.unaccent(coalesce(exercise.name_pt, ''))) like '%' || normalized.term || '%'
      or lower(exercise.name_en) like '%' || normalized.term || '%'
      or lower(extensions.unaccent(coalesce(alias.alias, ''))) like '%' || normalized.term || '%'
    )
  order by
    (alias.alias is not null) desc,
    (exercise.owner_trainer_id is not null) desc,
    -- Nomes que começam pelo termo vêm antes; nomes com termo residual "(…)" depois.
    (normalized.term <> '' and lower(extensions.unaccent(coalesce(exercise.name_pt, exercise.name_en))) like normalized.term || '%') desc,
    (coalesce(exercise.name_pt, '') like '%(%') asc,
    coalesce(exercise.name_pt, exercise.name_en)
  limit greatest(1, least(result_limit, 100));
$$;

grant execute on function public.search_exercises(text, text, text, integer) to authenticated;
