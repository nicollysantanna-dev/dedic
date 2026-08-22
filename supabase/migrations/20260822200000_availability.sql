alter table public.profiles
add column timezone text not null default 'America/Sao_Paulo';

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rule_time_order check (start_time < end_time),
  constraint availability_rule_date_order check (
    valid_until is null or valid_until >= valid_from
  ),
  constraint availability_rule_unique unique (
    trainer_id,
    iso_weekday,
    start_time,
    end_time,
    valid_from
  )
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(trim(reason)) between 2 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exception_time_order check (starts_at < ends_at)
);

create index availability_rules_trainer_weekday_idx
  on public.availability_rules (trainer_id, iso_weekday)
  where active = true;

create index availability_exceptions_trainer_range_idx
  on public.availability_exceptions (trainer_id, starts_at, ends_at);

create trigger availability_rules_set_updated_at
before update on public.availability_rules
for each row execute function public.set_updated_at();

create trigger availability_exceptions_set_updated_at
before update on public.availability_exceptions
for each row execute function public.set_updated_at();

alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;

create policy availability_rules_select_involved
on public.availability_rules for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.trainer_id = availability_rules.trainer_id
      and relationship.student_id = (select auth.uid())
      and relationship.status = 'active'
  )
);

create policy availability_rules_trainer_insert
on public.availability_rules for insert
to authenticated
with check (
  trainer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'trainer'
  )
);

create policy availability_rules_trainer_update
on public.availability_rules for update
to authenticated
using (trainer_id = (select auth.uid()))
with check (trainer_id = (select auth.uid()));

create policy availability_rules_trainer_delete
on public.availability_rules for delete
to authenticated
using (trainer_id = (select auth.uid()));

create policy availability_exceptions_select_involved
on public.availability_exceptions for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.trainer_id = availability_exceptions.trainer_id
      and relationship.student_id = (select auth.uid())
      and relationship.status = 'active'
  )
);

create policy availability_exceptions_trainer_insert
on public.availability_exceptions for insert
to authenticated
with check (
  trainer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'trainer'
  )
);

create policy availability_exceptions_trainer_update
on public.availability_exceptions for update
to authenticated
using (trainer_id = (select auth.uid()))
with check (trainer_id = (select auth.uid()));

create policy availability_exceptions_trainer_delete
on public.availability_exceptions for delete
to authenticated
using (trainer_id = (select auth.uid()));

create or replace function public.get_available_slots(
  target_trainer_id uuid,
  range_start date,
  range_end date
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lesson_duration_minutes integer;
  trainer_timezone text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if range_end < range_start or range_end > range_start + 31 then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  if auth.uid() <> target_trainer_id and not exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.trainer_id = target_trainer_id
      and relationship.student_id = auth.uid()
      and relationship.status = 'active'
  ) then
    raise exception 'RELATIONSHIP_REQUIRED';
  end if;

  select
    profile.default_lesson_duration_minutes,
    profile.timezone
  into lesson_duration_minutes, trainer_timezone
  from public.profiles profile
  where profile.id = target_trainer_id
    and profile.role = 'trainer';

  if lesson_duration_minutes is null then
    raise exception 'TRAINER_NOT_FOUND';
  end if;

  return query
  with calendar_days as (
    select generated_day::date as local_day
    from generate_series(range_start, range_end, interval '1 day') generated_day
  ),
  generated_slots as (
    select
      local_slot at time zone trainer_timezone as generated_start,
      (local_slot + make_interval(mins => lesson_duration_minutes))
        at time zone trainer_timezone as generated_end
    from calendar_days day
    join public.availability_rules rule
      on rule.trainer_id = target_trainer_id
      and rule.active = true
      and rule.iso_weekday = extract(isodow from day.local_day)::smallint
      and rule.valid_from <= day.local_day
      and (rule.valid_until is null or rule.valid_until >= day.local_day)
    cross join lateral generate_series(
      day.local_day + rule.start_time,
      day.local_day + rule.end_time - make_interval(mins => lesson_duration_minutes),
      make_interval(mins => lesson_duration_minutes)
    ) local_slot
  )
  select distinct generated.generated_start, generated.generated_end
  from generated_slots generated
  where generated.generated_start > now()
    and not exists (
      select 1
      from public.availability_exceptions exception
      where exception.trainer_id = target_trainer_id
        and tstzrange(exception.starts_at, exception.ends_at, '[)')
          && tstzrange(generated.generated_start, generated.generated_end, '[)')
    )
  order by generated.generated_start;
end;
$$;

revoke all on function public.get_available_slots(uuid, date, date) from public;
grant execute on function public.get_available_slots(uuid, date, date) to authenticated;

grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
