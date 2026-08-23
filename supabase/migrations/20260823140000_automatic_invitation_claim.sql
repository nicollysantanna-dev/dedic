alter table public.student_invitations
  alter column student_email drop not null,
  add column student_phone text;

alter table public.student_invitations
  add constraint invitation_has_single_contact check (
    num_nonnulls(student_email, student_phone) = 1
  ),
  add constraint invitation_phone_e164 check (
    student_phone is null or student_phone ~ '^\+[1-9][0-9]{9,14}$'
  );

create unique index one_pending_invitation_per_trainer_phone
  on public.student_invitations (trainer_id, student_phone)
  where status = 'pending' and student_phone is not null;

create index invitations_phone_status_idx
  on public.student_invitations (student_phone, status)
  where student_phone is not null;

create or replace function public.claim_student_invitation(invitation_token uuid default null)
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
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select role into current_role from public.profiles where id = auth.uid();
  if current_role <> 'student' then return null; end if;

  select * into relationship
  from public.trainer_student_relationships
  where student_id = auth.uid() and status = 'active'
  limit 1;
  if relationship.id is not null then return relationship; end if;

  current_email := extensions.citext(auth.jwt() ->> 'email');

  if invitation_token is not null then
    select * into invitation from public.student_invitations
    where token = invitation_token and status = 'pending' and expires_at > now()
    for update;
  else
    select * into invitation from public.student_invitations
    where student_email = current_email and status = 'pending' and expires_at > now()
    order by created_at limit 1 for update;
  end if;

  if invitation.id is null then return null; end if;

  if invitation.student_email is not null and invitation.student_email <> current_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  insert into public.trainer_student_relationships (
    trainer_id, student_id, status, started_at
  ) values (
    invitation.trainer_id, auth.uid(), 'active', now()
  )
  on conflict (trainer_id, student_id) do update
  set status = 'active', started_at = now(), ended_at = null
  returning * into relationship;

  update public.student_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;

  return relationship;
end;
$$;

revoke all on function public.claim_student_invitation(uuid) from public;
grant execute on function public.claim_student_invitation(uuid) to authenticated;
