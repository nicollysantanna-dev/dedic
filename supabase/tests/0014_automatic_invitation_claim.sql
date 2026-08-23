begin;

do $$
declare
  relationship public.trainer_student_relationships;
  invitation public.student_invitations;
  claimed public.trainer_student_relationships;
  student_email extensions.citext;
begin
  select * into relationship
  from public.trainer_student_relationships
  where status = 'active'
  limit 1;

  if relationship.id is null then
    raise exception 'TEST_REQUIRES_ACTIVE_RELATIONSHIP';
  end if;

  select extensions.citext(email) into student_email
  from auth.users
  where id = relationship.student_id;

  if student_email is null then
    raise exception 'TEST_REQUIRES_STUDENT_EMAIL';
  end if;

  update public.trainer_student_relationships
  set status = 'ended', ended_at = now()
  where id = relationship.id;

  insert into public.student_invitations (trainer_id, student_email)
  values (relationship.trainer_id, student_email)
  returning * into invitation;

  perform set_config('request.jwt.claim.sub', relationship.student_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', relationship.student_id, 'email', student_email)::text,
    true
  );

  claimed := public.claim_student_invitation(null);

  if claimed.id <> relationship.id or claimed.status <> 'active' then
    raise exception 'INVITATION_DID_NOT_REACTIVATE_RELATIONSHIP';
  end if;

  if (select status from public.student_invitations where id = invitation.id) <> 'accepted' then
    raise exception 'INVITATION_NOT_ACCEPTED';
  end if;
end;
$$;

rollback;
