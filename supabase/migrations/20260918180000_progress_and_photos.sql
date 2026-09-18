-- M4: evolução física — metas, registros de peso/medidas e fotos privadas (RF-22, RF-23).
-- Dados sensíveis: acesso somente ao aluno e ao personal com vínculo ativo (RN-18).

create type public.goal_kind as enum ('weight', 'attendance');
create type public.goal_status as enum ('active', 'achieved', 'abandoned');
create type public.photo_position as enum ('front', 'side', 'back');

-- 1. Metas definidas pelo personal.
create table public.student_goals (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  kind public.goal_kind not null,
  initial_value numeric(7, 2) not null,
  target_value numeric(7, 2) not null,
  target_date date not null,
  status public.goal_status not null default 'active',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_values_differ check (initial_value <> target_value),
  constraint goal_target_in_future check (target_date >= created_at::date)
);

create index student_goals_student_status_idx
  on public.student_goals (student_id, status);

create trigger student_goals_set_updated_at
before update on public.student_goals
for each row execute function public.set_updated_at();

-- 2. Registros manuais de peso e medidas: imutáveis, correção = novo registro.
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  recorded_on date not null,
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 400),
  measurements jsonb not null default '{}'::jsonb,
  note text check (note is null or char_length(note) <= 240),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint progress_entry_has_data check (
    weight_kg is not null or measurements <> '{}'::jsonb
  ),
  constraint progress_entry_not_in_future check (recorded_on <= current_date)
);

create index progress_entries_student_date_idx
  on public.progress_entries (student_id, recorded_on desc, created_at desc);

create trigger progress_entries_prevent_update
before update or delete on public.progress_entries
for each row execute function public.prevent_appointment_event_mutation();

-- 3. Metadados das fotos; o arquivo fica no bucket privado.
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  taken_on date not null,
  position public.photo_position not null,
  storage_path text not null unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint photo_path_belongs_to_student check (
    storage_path like student_id::text || '/%'
  ),
  constraint photo_not_in_future check (taken_on <= current_date)
);

create index progress_photos_student_date_idx
  on public.progress_photos (student_id, taken_on desc)
  where deleted_at is null;

-- Vínculo ativo entre o usuário autenticado (personal) e um aluno.
create or replace function public.is_active_trainer_of(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainer_student_relationships relationship
    where relationship.trainer_id = auth.uid()
      and relationship.student_id = target_student_id
      and relationship.status = 'active'
  );
$$;

revoke all on function public.is_active_trainer_of(uuid) from public;
grant execute on function public.is_active_trainer_of(uuid) to authenticated;

-- 4. RLS.
alter table public.student_goals enable row level security;
alter table public.progress_entries enable row level security;
alter table public.progress_photos enable row level security;

create policy goals_select_involved
on public.student_goals for select
to authenticated
using (student_id = (select auth.uid()) or trainer_id = (select auth.uid()));

create policy goals_trainer_insert
on public.student_goals for insert
to authenticated
with check (
  trainer_id = (select auth.uid())
  and created_by = (select auth.uid())
  and public.is_active_trainer_of(student_id)
);

create policy goals_trainer_update
on public.student_goals for update
to authenticated
using (trainer_id = (select auth.uid()))
with check (trainer_id = (select auth.uid()));

create policy progress_select_involved
on public.progress_entries for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.is_active_trainer_of(student_id)
);

create policy progress_insert_student_or_trainer
on public.progress_entries for insert
to authenticated
with check (
  recorded_by = (select auth.uid())
  and (
    student_id = (select auth.uid())
    or public.is_active_trainer_of(student_id)
  )
);

create policy photos_select_involved
on public.progress_photos for select
to authenticated
using (
  deleted_at is null
  and (
    student_id = (select auth.uid())
    or public.is_active_trainer_of(student_id)
  )
);

create policy photos_student_insert
on public.progress_photos for insert
to authenticated
with check (student_id = (select auth.uid()));

grant select, insert, update on public.student_goals to authenticated;
grant select, insert on public.progress_entries to authenticated;
grant select, insert on public.progress_photos to authenticated;

-- Exclusão pelo aluno: oculta o metadado. O arquivo é removido pelo cliente via
-- Storage API (a política de delete do bucket só permite ao próprio aluno).
create or replace function public.delete_progress_photo(target_photo_id uuid)
returns public.progress_photos
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo public.progress_photos;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into photo from public.progress_photos
  where id = target_photo_id for update;
  if photo.id is null then raise exception 'PHOTO_NOT_FOUND'; end if;
  if photo.student_id <> auth.uid() then raise exception 'STUDENT_REQUIRED'; end if;
  if photo.deleted_at is not null then return photo; end if;

  update public.progress_photos
  set deleted_at = now()
  where id = photo.id
  returning * into photo;

  return photo;
end;
$$;

revoke all on function public.delete_progress_photo(uuid) from public;
grant execute on function public.delete_progress_photo(uuid) to authenticated;

-- 5. Bucket privado e políticas de acesso ao arquivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy progress_photos_student_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy progress_photos_read_involved
on storage.objects for select
to authenticated
using (
  bucket_id = 'progress-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_active_trainer_of(((storage.foldername(name))[1])::uuid)
  )
);

create policy progress_photos_student_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
