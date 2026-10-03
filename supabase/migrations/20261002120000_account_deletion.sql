-- M7b: exclusão de conta por anonimização (LGPD, D9 da ADR 0005).
-- O perfil e o histórico de negócio permanecem; dados de saúde são apagados, notas
-- livres são limpas e o perfil é anonimizado. Só a função serverless (service_role)
-- executa a exclusão, numa única transação.

-- 1. Marca de exclusão no perfil.
alter table public.profiles add column deleted_at timestamptz;

-- 2. Convite aceito pode perder o contato (e-mail/celular) quando o aluno exclui a
-- conta; o vínculo histórico fica registrado em accepted_by.
alter table public.student_invitations drop constraint invitation_has_single_contact;
alter table public.student_invitations
  add constraint invitation_has_single_contact check (
    num_nonnulls(student_email, student_phone) = 1
    or (accepted_by is not null and student_email is null and student_phone is null)
  );

-- 3. Registros de progresso: imutáveis, exceto na exclusão de conta.
-- A GUC dedic.account_deletion só é ativada (local à transação) por delete_account.
create or replace function public.prevent_progress_entry_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('dedic.account_deletion', true) = 'on' then
    return old;
  end if;
  raise exception 'PROGRESS_ENTRIES_ARE_IMMUTABLE';
end;
$$;

drop trigger if exists progress_entries_prevent_update on public.progress_entries;

create trigger progress_entries_prevent_update
before update or delete on public.progress_entries
for each row execute function public.prevent_progress_entry_mutation();

-- 4. Trava do mesmo dia: a exclusão de conta cancela também aulas de hoje que
-- ainda não começaram.
create or replace function public.enforce_same_day_appointment_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('dedic.account_deletion', true) = 'on' then
    return new;
  end if;

  if old.status = 'scheduled'
    and new.status in (
      'cancelled_by_student',
      'cancelled_by_trainer',
      'cancelled_for_reschedule'
    )
    and (old.starts_at at time zone 'America/Sao_Paulo')::date
      <= (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'SAME_DAY_APPOINTMENT_LOCKED';
  end if;

  return new;
end;
$$;

comment on function public.enforce_same_day_appointment_lock() is
  'Impede cancelamento e remarcacao a partir do dia local da aula, exceto na exclusao de conta.';

-- 5. Exclusão de conta. Idempotente: uma segunda chamada não altera nada.
create or replace function public.delete_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.profiles;
  previous_subject text := current_setting('request.jwt.claim.sub', true);
  pending_appointment_id uuid;
  hevy_secret_id uuid;
begin
  select * into target_profile from public.profiles
  where id = target_user_id for update;
  if target_profile.id is null or target_profile.deleted_at is not null then
    return;
  end if;

  -- Libera as travas de exceção e faz o usuário excluído ser o ator de
  -- cancel_appointment e das notificações.
  perform set_config('dedic.account_deletion', 'on', true);
  perform set_config('request.jwt.claim.sub', target_user_id::text, true);

  -- Aulas futuras (inclusive de hoje, ainda não iniciadas): estorno, evento e
  -- notificação para a outra parte, pela mesma regra do cancelamento manual.
  for pending_appointment_id in
    select appointment.id from public.appointments appointment
    where appointment.status = 'scheduled'
      and appointment.starts_at > now()
      and (appointment.student_id = target_user_id or appointment.trainer_id = target_user_id)
    order by appointment.starts_at
  loop
    perform public.cancel_appointment(pending_appointment_id);
  end loop;

  update public.trainer_student_relationships
  set status = 'ended', ended_at = now()
  where (trainer_id = target_user_id or student_id = target_user_id)
    and status in ('active', 'pending');

  update public.student_invitations
  set status = 'cancelled'
  where trainer_id = target_user_id and status = 'pending';

  update public.student_invitations
  set student_email = null, student_phone = null
  where accepted_by = target_user_id;

  -- Dados de saúde do aluno.
  if target_profile.role = 'student' then
    delete from public.progress_entries where student_id = target_user_id;
    delete from public.progress_photos where student_id = target_user_id;
    delete from public.student_goals where student_id = target_user_id;
  end if;

  -- Treinos e fichas permanecem; notas em texto livre são limpas.
  update public.workouts
  set notes = null
  where (student_id = target_user_id or recorded_by = target_user_id)
    and notes is not null;

  update public.workout_exercises workout_exercise
  set notes = null
  from public.workouts workout
  where workout.id = workout_exercise.workout_id
    and (workout.student_id = target_user_id or workout.recorded_by = target_user_id)
    and workout_exercise.notes is not null;

  update public.routines
  set notes = null
  where (trainer_id = target_user_id or student_id = target_user_id or created_by = target_user_id)
    and notes is not null;

  update public.routine_exercises routine_exercise
  set notes = null
  from public.routines routine
  where routine.id = routine_exercise.routine_id
    and (routine.trainer_id = target_user_id or routine.student_id = target_user_id
      or routine.created_by = target_user_id)
    and routine_exercise.notes is not null;

  -- Hevy: conexão, chave no Vault e mapeamento de exercícios.
  select secret_id into hevy_secret_id from public.hevy_connections
  where user_id = target_user_id;
  if hevy_secret_id is not null then
    delete from public.hevy_connections where user_id = target_user_id;
    delete from vault.secrets where id = hevy_secret_id;
  end if;
  delete from public.hevy_exercise_template_map where owner_id = target_user_id;

  -- Por último entre as escritas que geram notificação para o próprio usuário.
  delete from public.notifications where user_id = target_user_id;

  update public.profiles
  set full_name = 'Usuário removido',
      phone = null,
      avatar_path = null,
      deleted_at = now()
  where id = target_user_id;

  -- Restaura o contexto para o restante da transação.
  perform set_config('dedic.account_deletion', 'off', true);
  perform set_config('request.jwt.claim.sub', coalesce(previous_subject, ''), true);
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;
