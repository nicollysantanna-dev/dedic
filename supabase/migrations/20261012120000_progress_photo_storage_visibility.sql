-- Fotos de evolução: o Storage só entrega o arquivo de uma foto ATIVA.
-- Antes, a política liberava qualquer objeto da pasta do aluno ou de um personal ativo,
-- inclusive arquivos de fotos já excluídas (soft delete não removia o objeto).

create index if not exists progress_photos_storage_path_idx
  on public.progress_photos (storage_path);

drop policy if exists progress_photos_read_involved on storage.objects;

create policy progress_photos_read_involved
on storage.objects for select
to authenticated
using (
  bucket_id = 'progress-photos'
  and exists (
    select 1
    from public.progress_photos photo
    where photo.storage_path = objects.name
      and photo.deleted_at is null
      and (
        photo.student_id = (select auth.uid())
        or public.is_active_trainer_of(photo.student_id)
      )
  )
);
