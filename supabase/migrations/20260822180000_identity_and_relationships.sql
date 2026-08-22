create extension if not exists citext with schema extensions;

create type public.app_role as enum ('student', 'trainer');
create type public.relationship_status as enum ('pending', 'active', 'ended');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'expired', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  phone text,
  role public.app_role not null,
  default_lesson_duration_minutes smallint check (
    default_lesson_duration_minutes is null
    or default_lesson_duration_minutes in (30, 45, 60, 75, 90)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_duration_required check (
    role = 'student' or default_lesson_duration_minutes is not null
  )
);

create table public.trainer_student_relationships (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  status public.relationship_status not null default 'active',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationship_distinct_users check (trainer_id <> student_id),
  constraint relationship_unique_pair unique (trainer_id, student_id)
);

create unique index one_active_trainer_per_student
  on public.trainer_student_relationships (student_id)
  where status = 'active';

create table public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  trainer_id uuid not null references public.profiles (id),
  student_email extensions.citext not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitation_future_expiration check (expires_at > created_at)
);

create unique index one_pending_invitation_per_trainer_email
  on public.student_invitations (trainer_id, student_email)
  where status = 'pending';

create index relationships_trainer_status_idx
  on public.trainer_student_relationships (trainer_id, status);

create index relationships_student_status_idx
  on public.trainer_student_relationships (student_id, status);

create index invitations_email_status_idx
  on public.student_invitations (student_email, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger relationships_set_updated_at
before update on public.trainer_student_relationships
for each row execute function public.set_updated_at();

create trigger invitations_set_updated_at
before update on public.student_invitations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.app_role;
  duration_minutes smallint;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'trainer' then 'trainer'::public.app_role
    else 'student'::public.app_role
  end;

  duration_minutes := case
    when requested_role = 'trainer'
      then coalesce((new.raw_user_meta_data ->> 'default_lesson_duration_minutes')::smallint, 60)
    else null
  end;

  insert into public.profiles (id, full_name, phone, role, default_lesson_duration_minutes)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role,
    duration_minutes
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.trainer_student_relationships enable row level security;
alter table public.student_invitations enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_select_linked
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.trainer_student_relationships relationship
    where relationship.status = 'active'
      and (
        (relationship.trainer_id = (select auth.uid()) and relationship.student_id = profiles.id)
        or
        (relationship.student_id = (select auth.uid()) and relationship.trainer_id = profiles.id)
      )
  )
);

create policy relationships_select_participant
on public.trainer_student_relationships for select
to authenticated
using (
  trainer_id = (select auth.uid())
  or student_id = (select auth.uid())
);

create policy relationships_trainer_end
on public.trainer_student_relationships for update
to authenticated
using (trainer_id = (select auth.uid()))
with check (trainer_id = (select auth.uid()));

create policy invitations_trainer_select
on public.student_invitations for select
to authenticated
using (trainer_id = (select auth.uid()));

create policy invitations_student_select
on public.student_invitations for select
to authenticated
using (
  student_email = extensions.citext((select auth.jwt() ->> 'email'))
  and status = 'pending'
  and expires_at > now()
);

create policy invitations_trainer_insert
on public.student_invitations for insert
to authenticated
with check (
  trainer_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'trainer'
  )
);

create policy invitations_trainer_cancel
on public.student_invitations for update
to authenticated
using (trainer_id = (select auth.uid()) and status = 'pending')
with check (trainer_id = (select auth.uid()));

create or replace function public.accept_student_invitation(invitation_token uuid)
returns public.trainer_student_relationships
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.student_invitations;
  relationship public.trainer_student_relationships;
  current_email extensions.citext;
  current_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select role into current_role
  from public.profiles
  where id = auth.uid();

  if current_role <> 'student' then
    raise exception 'STUDENT_REQUIRED';
  end if;

  current_email := extensions.citext(auth.jwt() ->> 'email');

  select * into invitation
  from public.student_invitations
  where token = invitation_token
  for update;

  if invitation.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'INVITATION_UNAVAILABLE';
  end if;

  if invitation.student_email <> current_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if exists (
    select 1 from public.trainer_student_relationships
    where student_id = auth.uid() and status = 'active'
  ) then
    raise exception 'STUDENT_ALREADY_LINKED';
  end if;

  insert into public.trainer_student_relationships (
    trainer_id,
    student_id,
    status,
    started_at
  ) values (
    invitation.trainer_id,
    auth.uid(),
    'active',
    now()
  )
  returning * into relationship;

  update public.student_invitations
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now()
  where id = invitation.id;

  return relationship;
end;
$$;

revoke all on function public.accept_student_invitation(uuid) from public;
grant execute on function public.accept_student_invitation(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, update on public.trainer_student_relationships to authenticated;
grant select, insert, update on public.student_invitations to authenticated;
