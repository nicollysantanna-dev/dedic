-- Reforços da evolução editável (ADR 0010), após revisão:
-- 1. Permissão de UPDATE só por coluna, sem depender dos privilégios padrão do projeto.
-- 2. Metas também registram quem fez a última alteração.
-- 3. Notificações de progresso e meta deixam de copiar valores de saúde, que poderiam
--    sobreviver à edição ou exclusão do registro original.

-- 1. Remove qualquer UPDATE de tabela inteira e concede de novo só as colunas editáveis.
revoke update on public.progress_entries from authenticated, anon;
revoke update on public.student_goals from authenticated, anon;
grant update (recorded_on, weight_kg, measurements, note) on public.progress_entries
  to authenticated;
grant update (initial_value, target_value, target_date, status) on public.student_goals
  to authenticated;

-- 2. Autoria da última alteração da meta (updated_at já é mantido por trigger).
alter table public.student_goals
  add column updated_by uuid references public.profiles (id);

create or replace function public.track_goal_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger student_goals_track_update
before update on public.student_goals
for each row execute function public.track_goal_update();

-- 3. Notificações sem valores de saúde.
create or replace function public.notify_goal_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_user(new.student_id, 'goal_created',
    'Nova meta definida pelo seu personal',
    'Confira a meta na sua evolução.',
    '/app/evolucao');
  return new;
end;
$$;

create or replace function public.notify_progress_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trainer uuid;
begin
  if new.recorded_by <> new.student_id then return new; end if;
  select relationship.trainer_id into trainer
  from public.trainer_student_relationships relationship
  where relationship.student_id = new.student_id and relationship.status = 'active';
  if trainer is not null then
    perform public.notify_user(trainer, 'progress_recorded',
      public.display_name(new.student_id) || ' registrou progresso',
      'Confira na evolução do aluno.',
      '/app/alunos/' || new.student_id);
  end if;
  return new;
end;
$$;

-- Limpa os valores já gravados em notificações existentes.
update public.notifications
set body = 'Confira a meta na sua evolução.'
where kind = 'goal_created';

update public.notifications
set body = 'Confira na evolução do aluno.'
where kind = 'progress_recorded';
