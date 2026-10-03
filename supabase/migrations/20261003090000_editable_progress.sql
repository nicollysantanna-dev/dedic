-- Evolução editável (ADR 0010): registros de peso/medidas e metas são dados do titular,
-- não lançamentos de negócio. Aluno e personal com vínculo ativo editam e apagam
-- registros e metas do aluno; a autoria da última alteração fica registrada.

-- 1. Registros de peso e medidas deixam de ser imutáveis.
drop trigger if exists progress_entries_prevent_update on public.progress_entries;
drop function if exists public.prevent_progress_entry_mutation();

alter table public.progress_entries
  add column updated_at timestamptz,
  add column updated_by uuid references public.profiles (id);

create or replace function public.track_progress_entry_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger progress_entries_track_update
before update on public.progress_entries
for each row execute function public.track_progress_entry_update();

create policy progress_update_involved
on public.progress_entries for update
to authenticated
using (
  student_id = (select auth.uid())
  or public.is_active_trainer_of(student_id)
)
with check (
  student_id = (select auth.uid())
  or public.is_active_trainer_of(student_id)
);

create policy progress_delete_involved
on public.progress_entries for delete
to authenticated
using (
  student_id = (select auth.uid())
  or public.is_active_trainer_of(student_id)
);

-- Só o conteúdo muda; aluno e autor original ficam fixos.
grant update (recorded_on, weight_kg, measurements, note) on public.progress_entries
  to authenticated;
grant delete on public.progress_entries to authenticated;

-- 2. Metas: aluno e personal da meta (com vínculo ativo) editam e apagam.
drop policy if exists goals_trainer_update on public.student_goals;

create policy goals_update_involved
on public.student_goals for update
to authenticated
using (
  student_id = (select auth.uid())
  or (trainer_id = (select auth.uid()) and public.is_active_trainer_of(student_id))
)
with check (
  student_id = (select auth.uid())
  or (trainer_id = (select auth.uid()) and public.is_active_trainer_of(student_id))
);

create policy goals_delete_involved
on public.student_goals for delete
to authenticated
using (
  student_id = (select auth.uid())
  or (trainer_id = (select auth.uid()) and public.is_active_trainer_of(student_id))
);

revoke update on public.student_goals from authenticated;
grant update (initial_value, target_value, target_date, status) on public.student_goals
  to authenticated;
grant delete on public.student_goals to authenticated;
