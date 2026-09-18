-- M2: perfil editável por RPC, transições de vínculo e convite por RPC,
-- convite por celular vinculado ao telefone, fuso fixo em São Paulo (ADR 0005).

-- 1. Fuso fixo: a coluna deixa de existir e a geração de slots usa São Paulo.
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
  trainer_timezone constant text := 'America/Sao_Paulo';
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

  select profile.default_lesson_duration_minutes
  into lesson_duration_minutes
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
    and not exists (
      select 1
      from public.appointments appointment
      where appointment.trainer_id = target_trainer_id
        and appointment.status = 'scheduled'
        and tstzrange(appointment.starts_at, appointment.ends_at, '[)')
          && tstzrange(generated.generated_start, generated.generated_end, '[)')
    )
  order by generated.generated_start;
end;
$$;

alter table public.profiles drop column timezone;

-- 2. Telefone do perfil em E.164 (ou nulo), como nos convites.
update public.profiles
set phone = null
where phone is not null and phone !~ '^\+[1-9][0-9]{9,14}$';

alter table public.profiles
  add constraint profile_phone_e164 check (
    phone is null or phone ~ '^\+[1-9][0-9]{9,14}$'
  );

-- 3. Perfil editável apenas por RPC (nome, telefone e duração padrão).
create or replace function public.update_own_profile(
  requested_full_name text,
  requested_phone text default null,
  requested_lesson_duration_minutes smallint default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles;
  normalized_name text := nullif(btrim(requested_full_name), '');
  normalized_phone text := nullif(btrim(requested_phone), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into current_profile from public.profiles where id = auth.uid() for update;
  if current_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 100 then
    raise exception 'INVALID_FULL_NAME';
  end if;
  if normalized_phone is not null and normalized_phone !~ '^\+[1-9][0-9]{9,14}$' then
    raise exception 'INVALID_PHONE';
  end if;

  if current_profile.role = 'trainer' then
    if requested_lesson_duration_minutes is null
      or requested_lesson_duration_minutes not in (30, 45, 60, 75, 90) then
      raise exception 'INVALID_LESSON_DURATION';
    end if;
  else
    requested_lesson_duration_minutes := null;
  end if;

  update public.profiles
  set full_name = normalized_name,
      phone = normalized_phone,
      default_lesson_duration_minutes = requested_lesson_duration_minutes
  where id = auth.uid()
  returning * into current_profile;

  return current_profile;
end;
$$;

revoke all on function public.update_own_profile(text, text, smallint) from public;
grant execute on function public.update_own_profile(text, text, smallint) to authenticated;

-- 4. Encerramento de vínculo por RPC, sem UPDATE livre na tabela.
drop policy relationships_trainer_end on public.trainer_student_relationships;
revoke update on public.trainer_student_relationships from authenticated;

create or replace function public.end_relationship(target_relationship_id uuid)
returns public.trainer_student_relationships
language plpgsql
security definer
set search_path = ''
as $$
declare
  relationship public.trainer_student_relationships;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into relationship from public.trainer_student_relationships
  where id = target_relationship_id for update;
  if relationship.id is null then raise exception 'RELATIONSHIP_NOT_FOUND'; end if;
  if relationship.trainer_id <> auth.uid() then raise exception 'TRAINER_REQUIRED'; end if;
  if relationship.status = 'ended' then return relationship; end if;

  -- Aulas futuras seguem agendadas até serem canceladas explicitamente;
  -- o histórico e os créditos permanecem intactos.
  update public.trainer_student_relationships
  set status = 'ended', ended_at = now()
  where id = relationship.id
  returning * into relationship;

  return relationship;
end;
$$;

revoke all on function public.end_relationship(uuid) from public;
grant execute on function public.end_relationship(uuid) to authenticated;

-- 5. Cancelamento de convite por RPC, sem UPDATE livre na tabela.
drop policy invitations_trainer_cancel on public.student_invitations;
revoke update on public.student_invitations from authenticated;

create or replace function public.cancel_student_invitation(target_invitation_id uuid)
returns public.student_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.student_invitations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into invitation from public.student_invitations
  where id = target_invitation_id for update;
  if invitation.id is null then raise exception 'INVITATION_NOT_FOUND'; end if;
  if invitation.trainer_id <> auth.uid() then raise exception 'TRAINER_REQUIRED'; end if;
  if invitation.status <> 'pending' then return invitation; end if;

  update public.student_invitations
  set status = 'cancelled'
  where id = invitation.id
  returning * into invitation;

  return invitation;
end;
$$;

revoke all on function public.cancel_student_invitation(uuid) from public;
grant execute on function public.cancel_student_invitation(uuid) to authenticated;

-- 6. Convite por celular fica vinculado ao telefone do aluno.
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
  current_phone text;
  account_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select profile.role, extensions.citext(account.email), profile.phone
  into account_role, current_email, current_phone
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

  if invitation.student_phone is not null then
    if current_phone is null then
      -- O link privado foi entregue a este número: registra o telefone no perfil.
      update public.profiles set phone = invitation.student_phone where id = auth.uid();
    elsif current_phone <> invitation.student_phone then
      raise exception 'INVITATION_PHONE_MISMATCH';
    end if;
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

-- 7. Função legada de aceite explícito deixa de existir.
drop function if exists public.accept_student_invitation(uuid);
