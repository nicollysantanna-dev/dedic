create or replace function public.enforce_same_day_appointment_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

drop trigger if exists appointments_same_day_lock on public.appointments;

create trigger appointments_same_day_lock
before update of status on public.appointments
for each row execute function public.enforce_same_day_appointment_lock();

comment on function public.enforce_same_day_appointment_lock() is
  'Impede cancelamento e remarcacao a partir do dia local da aula.';
