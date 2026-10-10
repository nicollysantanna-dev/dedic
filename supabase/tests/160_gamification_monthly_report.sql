-- Check-ins, semanas fechadas, medalhas e relatório mensal (ADR 0013, RF-28).
-- Os dados são de março e abril de 2026; o fechamento roda com o relógio real, então
-- meses antigos fecham sem avisar o aluno (só meses que acabaram de fechar avisam).
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  '00000000-0000-4000-8000-000000000004'::uuid as carla_id,
  '00000000-0000-4000-8000-000000000005'::uuid as davi_id;
grant select on ctx to authenticated, service_role;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Arrange (como postgres).
-- Ana: semana de 2/3 com 3 dias; semana de 9/3 com 2 dias (23h30 de 10/3 conta no dia
-- local); treino descartado em 13/3 não conta; dois treinos em 4/3 viram um dia.
insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, recorded_by)
select ana_id, trainer_id, 'Treino', s, s + interval '1 hour', ana_id
from ctx, (values
  (timestamp '2026-03-03 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-04 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-04 18:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-05 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-10 23:30' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-12 09:00' at time zone 'America/Sao_Paulo')
) as started(s);
insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, discarded_at, recorded_by)
select ana_id, trainer_id, 'Descartado',
  timestamp '2026-03-13 09:00' at time zone 'America/Sao_Paulo',
  timestamp '2026-03-13 10:00' at time zone 'America/Sao_Paulo', now(), ana_id
from ctx;
-- Ana: cinco treinos antes das 7h em abril (madrugador).
insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, recorded_by)
select ana_id, trainer_id, 'Cedo', s, s + interval '30 minutes', ana_id
from ctx, (values
  (timestamp '2026-04-06 06:30' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-04-07 06:30' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-04-08 06:30' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-04-09 06:30' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-04-10 06:30' at time zone 'America/Sao_Paulo')
) as early(s);
-- Bruno: semana 2/3 batida, 9/3 vazia, 16/3 batida -> volta por cima em março.
insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, recorded_by)
select bruno_id, trainer_id, 'Treino', s, s + interval '1 hour', bruno_id
from ctx, (values
  (timestamp '2026-03-03 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-04 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-05 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-16 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-17 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-18 09:00' at time zone 'America/Sao_Paulo')
) as bruno_days(s);
-- Carla: três dias em cada semana de março -> mês completo.
insert into public.workouts (student_id, trainer_id, name, started_at, finished_at, recorded_by)
select carla_id, trainer_id, 'Treino', s, s + interval '1 hour', carla_id
from ctx, (values
  (timestamp '2026-03-03 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-04 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-05 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-10 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-11 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-12 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-17 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-18 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-19 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-24 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-25 09:00' at time zone 'America/Sao_Paulo'),
  (timestamp '2026-03-26 09:00' at time zone 'America/Sao_Paulo')
) as carla_days(s);
-- Bruno: uma aula concluída em 11/3 (gatilho de aulas). Usa o vínculo e o pacote do Bruno
-- da seed; a semana de 9/3 continua abaixo da meta, então a volta por cima não muda.
insert into public.appointments (
  trainer_id, student_id, relationship_id, package_id, starts_at, ends_at,
  status, booking_request_id, created_by
)
select trainer_id, bruno_id,
  '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
  timestamp '2026-03-11 10:00' at time zone 'America/Sao_Paulo',
  timestamp '2026-03-11 11:00' at time zone 'America/Sao_Paulo', 'completed',
  gen_random_uuid(), trainer_id
from ctx;

-- Fechamento e semanas.
select ok(public.close_weeks() > 0, 'fechamento grava as semanas pendentes');
select is(
  (select count(*) from public.student_check_ins
    where student_id = (select ana_id from ctx) and day = date '2026-03-04'),
  1::bigint, 'dois treinos no mesmo dia viram um check-in');
select is(
  (select count(*) from public.student_check_ins
    where student_id = (select ana_id from ctx) and day = date '2026-03-13'),
  0::bigint, 'treino descartado não conta');
select is(
  (select count(*) from public.student_check_ins
    where student_id = (select ana_id from ctx) and day = date '2026-03-10'),
  1::bigint, 'treino às 23h30 de Brasília conta no dia local');
select is(
  (select check_ins from public.student_week_results
    where student_id = (select ana_id from ctx) and week_start = date '2026-03-02'),
  3, 'semana 2/3 de Ana tem 3 check-ins');
select ok(
  (select met from public.student_week_results
    where student_id = (select ana_id from ctx) and week_start = date '2026-03-02'),
  'semana 2/3 de Ana foi batida');
select is(
  (select check_ins from public.student_week_results
    where student_id = (select ana_id from ctx) and week_start = date '2026-03-09'),
  2, 'semana 9/3 de Ana tem 2 check-ins');
select ok(
  not (select met from public.student_week_results
    where student_id = (select ana_id from ctx) and week_start = date '2026-03-09'),
  'semana 9/3 de Ana não foi batida');
select is(
  (select target from public.student_week_results
    where student_id = (select ana_id from ctx) and week_start = date '2026-03-02'),
  3, 'sem meta de frequência, a meta semanal é 3');
select is(public.close_weeks(), 0, 'segundo fechamento não altera nada');

-- Avisos: o primeiro fechamento não avisa o histórico.
select is(
  (select count(*) from public.notifications
    where user_id = (select ana_id from ctx) and kind = 'monthly_report'),
  0::bigint, 'histórico fechado não gera aviso de resumo');

-- Medalhas.
select ok(exists (select 1 from public.student_achievements
  where student_id = (select bruno_id from ctx) and code = 'comeback'
    and period_start = date '2026-03-01'), 'volta por cima concedida a Bruno em março');
select ok(exists (select 1 from public.student_achievements
  where student_id = (select carla_id from ctx) and code = 'full_month'
    and period_start = date '2026-03-01'), 'mês completo concedido a Carla');
select ok(not exists (select 1 from public.student_achievements
  where student_id = (select ana_id from ctx) and code = 'full_month'),
  'Ana não ganha mês completo com semanas não batidas');
select ok(exists (select 1 from public.student_achievements
  where student_id = (select ana_id from ctx) and code = 'early_bird'
    and period_start = date '2026-04-01'), 'madrugador de abril com 5 treinos antes das 7h');
select is(
  (select count(*) from public.student_achievements
    where student_id = (select ana_id from ctx) and code = 'first_check_in'),
  1::bigint, 'primeira medalha concedida uma única vez');
select lives_ok(
  $$ select public.award_achievements((select ana_id from ctx)) $$,
  'conceder medalhas de novo é seguro');
select is(
  (select count(*) from public.student_achievements
    where student_id = (select ana_id from ctx) and code = 'first_check_in'),
  1::bigint, 'conceder de novo não duplica medalha');

-- Relatório de Ana, como ela mesma.
select pg_temp.login((select ana_id from ctx));
select is(
  (public.monthly_report((select ana_id from ctx), date '2026-03-01') ->> 'check_ins')::integer,
  5, 'relatório de março: 5 dias com check-in');
select is(
  jsonb_array_length(public.monthly_report((select ana_id from ctx), date '2026-03-01') -> 'weeks'),
  4, 'relatório de março: 4 semanas');
select is(
  (public.monthly_report((select ana_id from ctx), date '2026-03-01') ->> 'in_progress')::boolean,
  false, 'relatório de março já está fechado');
select is(
  (public.monthly_report((select ana_id from ctx), date '2026-03-01') -> 'streak' ->> 'best')::integer,
  1, 'recorde de sequência de Ana é 1');
select is(
  public.monthly_report((select ana_id from ctx), date '2026-03-01') -> 'next_achievement' ->> 'code',
  'streak_4', 'próxima medalha de Ana é sequência 4 (maior progresso)');

-- Autorização e isolamento.
select pg_temp.login((select bruno_id from ctx));
select throws_ok(
  $$ select public.monthly_report((select ana_id from ctx), date '2026-03-01') $$,
  'REPORT_ACCESS_DENIED', 'aluno sem vínculo não lê o relatório de outro aluno');

set local role authenticated;
select is(
  (select count(*) from public.student_check_ins where student_id = (select ana_id from ctx)),
  0::bigint, 'aluno não lê check-ins de outro aluno');
select is(
  (select count(*) from public.student_week_results where student_id = (select ana_id from ctx)),
  0::bigint, 'aluno não lê semanas de outro aluno');
reset role;

select pg_temp.login((select ana_id from ctx));
set local role authenticated;
select throws_ok(
  $$ insert into public.student_week_results (student_id, week_start, check_ins, target, met)
     values ((select ana_id from ctx), date '2026-02-02', 7, 3, true) $$,
  'permission denied for table student_week_results',
  'ninguém grava semanas diretamente');
select throws_ok(
  $$ insert into public.student_achievements (student_id, code)
     values ((select ana_id from ctx), 'streak_4') $$,
  'permission denied for table student_achievements',
  'ninguém grava medalhas diretamente');
reset role;

-- Aula concluída aparece no relatório de Bruno.
select pg_temp.login((select bruno_id from ctx));
select is(
  (public.monthly_report((select bruno_id from ctx), date '2026-03-01') ->> 'lessons_completed')::integer,
  1, 'aula concluída aparece no relatório');

select * from finish();
rollback;
