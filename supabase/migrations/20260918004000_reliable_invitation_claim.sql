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
  account_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select profile.role, extensions.citext(account.email)
  into account_role, current_email
  from public.profiles profile
  join auth.users account on account.id = profile.id
  where profile.id = auth.uid();

  if account_role <> 'student' then
    raise exception 'STUDENT_REQUIRED';
  end if;

  if invitation_token is not null then
    select * into invitation
    from public.student_invitations
    where token = invitation_token
      and status = 'pending'
      and expires_at > now()
    for update;
  else
    select * into invitation
    from public.student_invitations
    where student_email = current_email
      and status = 'pending'
      and expires_at > now()
    order by created_at
    limit 1
    for update;
  end if;

  if invitation.id is null then
    return null;
  end if;

  if invitation.student_email is not null and invitation.student_email <> current_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  select * into relationship
  from public.trainer_student_relationships
  where student_id = auth.uid()
    and status = 'active'
  limit 1;

  if relationship.id is not null then
    if relationship.trainer_id <> invitation.trainer_id then
      raise exception 'STUDENT_ALREADY_LINKED';
    end if;

    update public.student_invitations
    set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
    where id = invitation.id;

    return relationship;
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
