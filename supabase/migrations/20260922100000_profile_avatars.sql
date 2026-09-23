-- Foto de perfil para personal e aluno. Segue o padrão já usado em fotos de
-- evolução e de exercícios: bucket privado, pasta pelo próprio uid, RPC
-- dedicada para não reabrir a validação de nome/telefone/duração.

alter table public.profiles add column avatar_path text;
alter table public.profiles
  add constraint avatar_path_belongs_to_owner check (
    avatar_path is null or avatar_path like id::text || '/%'
  );

create or replace function public.update_own_avatar(requested_avatar_path text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles;
  normalized_path text := nullif(btrim(requested_avatar_path), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  if normalized_path is not null and normalized_path !~ ('^' || auth.uid()::text || '/') then
    raise exception 'INVALID_AVATAR_PATH';
  end if;

  update public.profiles
  set avatar_path = normalized_path
  where id = auth.uid()
  returning * into current_profile;

  if current_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  return current_profile;
end;
$$;

revoke all on function public.update_own_avatar(text) from public;
grant execute on function public.update_own_avatar(text) to authenticated;

-- Bucket privado; visível ao próprio dono e a quem tem vínculo ativo com ele
-- (personal vê foto do aluno e vice-versa), igual à leitura de progress-photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar-photos', 'avatar-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatar_photos_owner_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatar-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatar_photos_owner_update
on storage.objects for update
to authenticated
using (bucket_id = 'avatar-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatar-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatar_photos_owner_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'avatar-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatar_photos_read_involved
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatar-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.trainer_student_relationships relationship
      where relationship.status = 'active'
        and (
          (relationship.trainer_id = (select auth.uid())
            and relationship.student_id = ((storage.foldername(name))[1])::uuid)
          or (relationship.student_id = (select auth.uid())
            and relationship.trainer_id = ((storage.foldername(name))[1])::uuid)
        )
    )
  )
);
