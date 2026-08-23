drop function if exists public.cancel_appointment(uuid);

create function public.cancel_appointment(
  target_appointment_id uuid,
  cancellation_note text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_appointment public.appointments;
  cancellation_status public.appointment_status;
  normalized_note text := nullif(btrim(cancellation_note), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if normalized_note is not null and char_length(normalized_note) > 300 then
    raise exception 'CANCELLATION_NOTE_TOO_LONG';
  end if;

  select * into target_appointment from public.appointments
  where id = target_appointment_id for update;
  if target_appointment.id is null then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if auth.uid() <> target_appointment.student_id
    and auth.uid() <> target_appointment.trainer_id then
    raise exception 'APPOINTMENT_ACCESS_DENIED';
  end if;
  if target_appointment.status in ('cancelled_by_student', 'cancelled_by_trainer') then
    return target_appointment;
  end if;
  if target_appointment.status <> 'scheduled' then
    raise exception 'APPOINTMENT_CANNOT_BE_CANCELLED';
  end if;
  if target_appointment.starts_at <= now() then
    raise exception 'PAST_APPOINTMENT_CANNOT_BE_CANCELLED';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_appointment.student_id::text));
  cancellation_status := case
    when auth.uid() = target_appointment.student_id
      then 'cancelled_by_student'::public.appointment_status
    else 'cancelled_by_trainer'::public.appointment_status
  end;

  update public.appointments
  set status = cancellation_status, cancelled_at = now()
  where id = target_appointment.id
  returning * into target_appointment;

  insert into public.credit_transactions (
    trainer_id, student_id, package_id, appointment_id, amount,
    transaction_type, reason, created_by
  ) values (
    target_appointment.trainer_id, target_appointment.student_id,
    target_appointment.package_id, target_appointment.id, 1,
    'cancellation_refund',
    coalesce('Devolução por cancelamento: ' || normalized_note, 'Devolução por cancelamento'),
    auth.uid()
  );

  insert into public.appointment_events (
    appointment_id, trainer_id, student_id, event_type, actor_id, details
  ) values (
    target_appointment.id, target_appointment.trainer_id,
    target_appointment.student_id, 'cancelled', auth.uid(),
    jsonb_strip_nulls(jsonb_build_object(
      'status', cancellation_status,
      'reason', normalized_note
    ))
  );

  return target_appointment;
exception
  when unique_violation then
    select * into target_appointment from public.appointments
    where id = target_appointment_id;
    return target_appointment;
end;
$$;

revoke all on function public.cancel_appointment(uuid, text) from public;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;

create or replace function public.finalize_elapsed_appointments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  finalized_count integer;
begin
  with finalized as (
    update public.appointments appointment
    set status = 'completed'
    where appointment.status = 'scheduled'
      and appointment.ends_at <= now()
    returning appointment.*
  ), inserted_events as (
    insert into public.appointment_events (
      appointment_id, trainer_id, student_id, event_type, actor_id, details
    )
    select
      finalized.id, finalized.trainer_id, finalized.student_id,
      'completed', finalized.trainer_id,
      jsonb_build_object(
        'automatic', true,
        'completed_at', now(),
        'scheduled_end', finalized.ends_at
      )
    from finalized
    returning 1
  )
  select count(*)::integer into finalized_count from inserted_events;

  return finalized_count;
end;
$$;

revoke all on function public.finalize_elapsed_appointments() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'dedic-finalize-elapsed-appointments',
  '* * * * *',
  'select public.finalize_elapsed_appointments();'
);
