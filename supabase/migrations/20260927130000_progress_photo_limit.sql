-- Limite de fotos de evolução por aluno: evita crescimento sem controle do
-- bucket/tabela (cada foto ocupa até 5MB, sem essa trava um aluno poderia
-- subir fotos indefinidamente). O limite conta só fotos ativas
-- (deleted_at is null) — excluir uma foto libera espaço para enviar outra.
create or replace function public.enforce_progress_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_limit constant integer := 60;
  active_count integer;
begin
  select count(*) into active_count
  from public.progress_photos
  where student_id = new.student_id and deleted_at is null;

  if active_count >= photo_limit then
    raise exception 'PHOTO_LIMIT_REACHED' using
      hint = 'Exclua uma foto antiga para enviar outra.';
  end if;

  return new;
end;
$$;

create trigger progress_photos_enforce_limit
before insert on public.progress_photos
for each row execute function public.enforce_progress_photo_limit();
