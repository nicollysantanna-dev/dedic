-- Seed determinístico para desenvolvimento local, testes de banco e E2E.
-- Nunca é aplicado em produção: o Supabase CLI só executa este arquivo em
-- `supabase start` / `supabase db reset` contra o banco local.
--
-- Usuários (senha de todos: dedic-local-2026):
--   personal:  personal@dedic.local  (00000000-0000-4000-8000-000000000001)
--   aluna:     aluna@dedic.local     (00000000-0000-4000-8000-000000000002)
--   aluno:     aluno@dedic.local     (00000000-0000-4000-8000-000000000003)
--   externa:   externa@dedic.local   (00000000-0000-4000-8000-000000000004) sem vínculo

create or replace function public.seed_user(
  user_id uuid,
  user_email text,
  user_metadata jsonb
) returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated',
    user_email, extensions.crypt('dedic-local-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, user_metadata, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), user_id, user_id::text,
    jsonb_build_object('sub', user_id::text, 'email', user_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$$;

select public.seed_user(
  '00000000-0000-4000-8000-000000000001',
  'personal@dedic.local',
  '{"full_name":"Paula Personal","role":"trainer","default_lesson_duration_minutes":60,"phone":"+5511999990001"}'
);
select public.seed_user(
  '00000000-0000-4000-8000-000000000002',
  'aluna@dedic.local',
  '{"full_name":"Ana Aluna","role":"student","phone":"+5511999990002"}'
);
select public.seed_user(
  '00000000-0000-4000-8000-000000000003',
  'aluno@dedic.local',
  '{"full_name":"Bruno Aluno","role":"student","phone":"+5511999990003"}'
);
select public.seed_user(
  '00000000-0000-4000-8000-000000000004',
  'externa@dedic.local',
  '{"full_name":"Carla Externa","role":"student"}'
);

drop function public.seed_user(uuid, text, jsonb);

-- Vínculos ativos da personal com os dois alunos.
insert into public.trainer_student_relationships (id, trainer_id, student_id, status, started_at)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002', 'active', now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000003', 'active', now());

-- Disponibilidade ampla em todos os dias, para que sempre existam horários livres.
insert into public.availability_rules (trainer_id, iso_weekday, start_time, end_time)
select '00000000-0000-4000-8000-000000000001', weekday, '06:00', '22:00'
from generate_series(1, 7) as weekday;

-- Pacote ativo de 10 aulas para cada aluno, com a entrada de créditos no extrato.
insert into public.lesson_packages (
  id, trainer_id, student_id, relationship_id, lesson_count, price_cents,
  starts_on, expires_on, status, activated_at
) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   10, 120000, current_date, current_date + 365, 'active', now()),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   10, 120000, current_date, current_date + 365, 'active', now());

insert into public.credit_transactions (
  trainer_id, student_id, package_id, amount, transaction_type, reason, created_by
) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 10, 'package_activation',
   'Ativação do pacote', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000002', 10, 'package_activation',
   'Ativação do pacote', '00000000-0000-4000-8000-000000000001');

-- Cobrança pendente da aluna, para os painéis financeiros terem dados.
insert into public.payments (
  id, trainer_id, student_id, package_id, amount_cents, due_on, status, created_by
) values (
  '30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
  120000, current_date + 7, 'pending', '00000000-0000-4000-8000-000000000001'
);
