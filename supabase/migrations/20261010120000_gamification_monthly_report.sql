-- Gamificação e relatório mensal de check-ins (ADR 0013, RF-28).
-- Check-in: dia (America/Sao_Paulo) com treino finalizado ou aula concluída.
-- Semana: segunda a domingo; pertence ao mês da sua quinta-feira.
-- Resultados de semana e medalhas são gravados e nunca alterados depois.

alter type public.notification_kind add value if not exists 'monthly_report';

create function public.week_start_of(day date)
returns date
language sql
immutable
set search_path = ''
as $$
  select day - (extract(isodow from day)::integer - 1);
$$;

create function public.month_name_pt(month_start date)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array[
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ])[extract(month from month_start)::integer];
$$;

-- Segunda-feira seguinte à última semana do mês: dia em que o mês fecha.
create function public.month_closes_on(month_start date)
returns date
language sql
stable
set search_path = ''
as $$
  select last_day - ((extract(isodow from last_day)::integer - 4 + 7) % 7) + 4
  from (select (month_start + interval '1 month' - interval '1 day')::date as last_day) days;
$$;

-- Um registro por aluno e dia com atividade. "early" marca atividade antes das 7h locais.
create view public.student_check_ins with (security_invoker = true) as
with activities as (
  select
    workout.student_id,
    (workout.started_at at time zone 'America/Sao_Paulo')::date as day,
    true as is_workout,
    false as is_lesson,
    (workout.started_at at time zone 'America/Sao_Paulo')::time < time '07:00' as early
  from public.workouts workout
  where workout.finished_at is not null and workout.discarded_at is null
  union all
  select
    appointment.student_id,
    (appointment.starts_at at time zone 'America/Sao_Paulo')::date,
    false,
    true,
    (appointment.starts_at at time zone 'America/Sao_Paulo')::time < time '07:00'
  from public.appointments appointment
  where appointment.status = 'completed'
)
select
  student_id,
  day,
  bool_or(is_workout) as had_workout,
  bool_or(is_lesson) as had_lesson,
  bool_or(early) as early
from activities
group by student_id, day;

revoke all on public.student_check_ins from anon, authenticated;
grant select on public.student_check_ins to authenticated;

create table public.student_week_results (
  student_id uuid not null references public.profiles (id),
  week_start date not null,
  check_ins integer not null check (check_ins between 0 and 7),
  target integer not null check (target >= 1),
  met boolean not null,
  closed_at timestamptz not null default now(),
  primary key (student_id, week_start),
  constraint week_met_matches_target check (met = (check_ins >= target))
);

create table public.student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  code text not null check (code in (
    'first_check_in', 'streak_4', 'streak_8', 'streak_12',
    'check_ins_10', 'check_ins_50', 'check_ins_100',
    'lessons_10', 'lessons_50', 'lessons_100',
    'full_month', 'comeback', 'early_bird'
  )),
  period_start date,
  earned_at timestamptz not null default now(),
  constraint achievement_period_matches_kind check (
    (code in ('full_month', 'comeback', 'early_bird')) = (period_start is not null)
  ),
  constraint student_achievements_unique unique nulls not distinct (student_id, code, period_start)
);

alter table public.student_week_results enable row level security;
alter table public.student_achievements enable row level security;

-- Leitura: o próprio aluno e o personal com vínculo ativo. Sem políticas de escrita.
create policy student_week_results_read_involved on public.student_week_results
for select to authenticated
using (student_id = (select auth.uid()) or public.is_active_trainer_of(student_id));

create policy student_achievements_read_involved on public.student_achievements
for select to authenticated
using (student_id = (select auth.uid()) or public.is_active_trainer_of(student_id));

revoke all on public.student_week_results from anon, authenticated;
revoke all on public.student_achievements from anon, authenticated;
grant select on public.student_week_results to authenticated;
grant select on public.student_achievements to authenticated;

-- Meta semanal: meta de frequência ativa; sem meta, 3.
create function public.weekly_check_in_target(target_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select greatest(round(goal.target_value)::integer, 1)
      from public.student_goals goal
      where goal.student_id = target_student_id
        and goal.kind = 'attendance'
        and goal.status = 'active'
      order by goal.created_at desc
      limit 1
    ),
    3
  );
$$;

create function public.student_check_ins_in_week(target_student_id uuid, week date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.student_check_ins check_in
  where check_in.student_id = target_student_id
    and check_in.day >= week
    and check_in.day < week + 7;
$$;

-- Sequência atual (termina na última semana fechada, +1 se a semana atual já foi batida)
-- e recorde (maior sequência da história, incluindo a atual).
create function public.student_streaks(target_student_id uuid, today date)
returns table (streak_now integer, streak_best integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_week date := public.week_start_of(today);
  last_week date;
  last_met boolean;
  closed_streak integer := 0;
  best_closed integer := 0;
  current_met boolean;
begin
  select result.week_start, result.met into last_week, last_met
  from public.student_week_results result
  where result.student_id = target_student_id
  order by result.week_start desc
  limit 1;

  if last_met then
    with recursive run as (
      select result.week_start
      from public.student_week_results result
      where result.student_id = target_student_id and result.week_start = last_week
      union all
      select previous.week_start
      from public.student_week_results previous
      join run on previous.week_start = run.week_start - 7
      where previous.student_id = target_student_id and previous.met
    )
    select count(*)::integer into closed_streak from run;
  end if;

  current_met := public.student_check_ins_in_week(target_student_id, current_week)
    >= public.weekly_check_in_target(target_student_id);

  select coalesce(max(island.run_length), 0)::integer into best_closed
  from (
    select count(*) as run_length
    from (
      select
        result.week_start - (row_number() over (order by result.week_start))::integer * 7 as island_key
      from public.student_week_results result
      where result.student_id = target_student_id and result.met
    ) numbered
    group by numbered.island_key
  ) island;

  streak_now := closed_streak + case when current_met then 1 else 0 end;
  streak_best := greatest(best_closed, streak_now);
  return next;
end;
$$;

-- Medalhas do mês: semanas do mês (pela quinta-feira) fechadas, batidas e padrões de volta/madrugada.
create function public.award_monthly_achievements(target_student_id uuid, month_start date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  month_end date := (month_start + interval '1 month' - interval '1 day')::date;
  total_weeks integer;
  closed_weeks integer;
  met_weeks integer;
  has_comeback boolean;
  early_days integer;
begin
  with month_weeks as (
    select (month_day::date - 3) as week_start
    from generate_series(month_start::timestamp, month_end::timestamp, interval '1 day') as month_day
    where extract(isodow from month_day) = 4
  )
  select
    count(*)::integer,
    count(result.student_id)::integer,
    count(*) filter (where result.met)::integer
  into total_weeks, closed_weeks, met_weeks
  from month_weeks
  left join public.student_week_results result
    on result.student_id = target_student_id and result.week_start = month_weeks.week_start;

  select exists (
    select 1
    from public.student_week_results result
    join public.student_week_results previous
      on previous.student_id = result.student_id and previous.week_start = result.week_start - 7
    where result.student_id = target_student_id
      and result.met
      and not previous.met
      and result.week_start + 3 between month_start and month_end
      and exists (
        select 1
        from public.student_week_results earlier
        where earlier.student_id = target_student_id
          and earlier.met
          and earlier.week_start < result.week_start
      )
  ) into has_comeback;

  select count(*)::integer into early_days
  from public.student_check_ins check_in
  where check_in.student_id = target_student_id
    and check_in.early
    and check_in.day between month_start and month_end;

  insert into public.student_achievements (student_id, code, period_start)
  select target_student_id, candidate.code, month_start
  from (values
    ('full_month', total_weeks > 0 and closed_weeks = total_weeks and met_weeks = total_weeks),
    ('comeback', has_comeback),
    ('early_bird', early_days >= 5)
  ) as candidate(code, earned)
  where candidate.earned
  on conflict on constraint student_achievements_unique do nothing;
end;
$$;

-- Concede o que faltar. Idempotente: medalha concedida não se repete nem é revogada.
create function public.award_achievements(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.local_today();
  total_check_ins integer;
  total_lessons integer;
  best_streak integer;
  month_row record;
begin
  select count(*)::integer into total_check_ins
  from public.student_check_ins check_in
  where check_in.student_id = target_student_id;

  select count(*)::integer into total_lessons
  from public.appointments appointment
  where appointment.student_id = target_student_id and appointment.status = 'completed';

  select streaks.streak_best into best_streak
  from public.student_streaks(target_student_id, today) streaks;

  insert into public.student_achievements (student_id, code, period_start)
  select target_student_id, candidate.code, null
  from (values
    ('first_check_in', total_check_ins >= 1),
    ('streak_4', coalesce(best_streak, 0) >= 4),
    ('streak_8', coalesce(best_streak, 0) >= 8),
    ('streak_12', coalesce(best_streak, 0) >= 12),
    ('check_ins_10', total_check_ins >= 10),
    ('check_ins_50', total_check_ins >= 50),
    ('check_ins_100', total_check_ins >= 100),
    ('lessons_10', total_lessons >= 10),
    ('lessons_50', total_lessons >= 50),
    ('lessons_100', total_lessons >= 100)
  ) as candidate(code, earned)
  where candidate.earned
  on conflict on constraint student_achievements_unique do nothing;

  for month_row in
    select distinct date_trunc('month', check_in.day)::date as month_start
    from public.student_check_ins check_in
    where check_in.student_id = target_student_id
  loop
    perform public.award_monthly_achievements(target_student_id, month_row.month_start);
  end loop;
end;
$$;

-- Fechamento semanal (cron, segunda 03h de Brasília). Grava as semanas anteriores ainda
-- não fechadas a partir da primeira semana com check-in, concede medalhas e avisa o aluno
-- quando um mês acaba de fechar com pelo menos um check-in.
create function public.close_weeks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.local_today();
  closed_week record;
  closed_count integer := 0;
  thursday date;
  month_start date;
begin
  for closed_week in
    with first_weeks as (
      select check_in.student_id, public.week_start_of(min(check_in.day)) as first_week
      from public.student_check_ins check_in
      group by check_in.student_id
    ),
    pending as (
      select first_weeks.student_id, week_row::date as week_start
      from first_weeks
      cross join lateral generate_series(
        first_weeks.first_week::timestamp, (today - 7)::timestamp, interval '7 days'
      ) as week_row
      where not exists (
        select 1
        from public.student_week_results result
        where result.student_id = first_weeks.student_id
          and result.week_start = week_row::date
      )
    ),
    counted as (
      select
        pending.student_id,
        pending.week_start,
        public.student_check_ins_in_week(pending.student_id, pending.week_start) as check_ins,
        public.weekly_check_in_target(pending.student_id) as target
      from pending
    )
    insert into public.student_week_results (student_id, week_start, check_ins, target, met)
    select student_id, week_start, check_ins, target, check_ins >= target
    from counted
    returning student_id, week_start
  loop
    closed_count := closed_count + 1;
    perform public.award_achievements(closed_week.student_id);

    -- A semana pertence ao mês da sua quinta-feira. Ela é a última do mês quando a
    -- semana seguinte já cai no mês seguinte.
    thursday := closed_week.week_start + 3;
    if date_trunc('month', thursday + 7) <> date_trunc('month', thursday) then
      month_start := date_trunc('month', thursday)::date;
      -- Só avisa meses que acabaram de fechar, para o primeiro fechamento não avisar
      -- todo o histórico.
      if public.month_closes_on(month_start) > today - 7
        and exists (
          select 1
          from public.student_check_ins check_in
          where check_in.student_id = closed_week.student_id
            and check_in.day >= month_start
            and check_in.day < (month_start + interval '1 month')::date
        )
      then
        perform public.notify_user(
          closed_week.student_id,
          'monthly_report',
          'Seu resumo de ' || public.month_name_pt(month_start) || ' chegou 🎉',
          null,
          '/app/resumo/' || to_char(month_start, 'YYYY-MM')
        );
      end if;
    end if;
  end loop;

  return closed_count;
end;
$$;

-- Medalhas por atividade: treino finalizado ou aula concluída.
create function public.award_from_workout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finished_at is not null and new.discarded_at is null then
    perform public.award_achievements(new.student_id);
  end if;
  return new;
end;
$$;

create trigger workouts_award_achievements
after insert or update on public.workouts
for each row execute function public.award_from_workout();

create function public.award_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.award_achievements(new.student_id);
  end if;
  return new;
end;
$$;

create trigger appointments_award_achievements
after insert or update on public.appointments
for each row execute function public.award_from_appointment();

-- JSON do relatório (tela do aluno e do personal). Quem não pode ler o aluno é recusado.
create function public.monthly_report(target_student_id uuid, report_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  month_start date := date_trunc('month', report_month)::date;
  month_end date := (month_start + interval '1 month' - interval '1 day')::date;
  today date := public.local_today();
  streaks record;
  month_check_ins integer;
  days_json jsonb;
  weeks_json jsonb;
  medals_json jsonb;
  total_check_ins integer;
  total_lessons integer;
  lessons_done integer;
  next_code text;
  next_current integer;
  next_target integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if auth.uid() <> target_student_id and not public.is_active_trainer_of(target_student_id) then
    raise exception 'REPORT_ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'day', check_in.day,
      'had_workout', check_in.had_workout,
      'had_lesson', check_in.had_lesson
    ) order by check_in.day), '[]'::jsonb),
    count(*)::integer
  into days_json, month_check_ins
  from public.student_check_ins check_in
  where check_in.student_id = target_student_id
    and check_in.day between month_start and month_end;

  select coalesce(jsonb_agg(jsonb_build_object(
      'week_start', month_week.week_start,
      'check_ins', month_week.check_ins,
      'target', month_week.week_target,
      'met', month_week.check_ins >= month_week.week_target,
      'closed', month_week.closed
    ) order by month_week.week_start), '[]'::jsonb)
  into weeks_json
  from (
    select
      week_row.week_start,
      coalesce(
        result.check_ins,
        public.student_check_ins_in_week(target_student_id, week_row.week_start)
      ) as check_ins,
      coalesce(result.target, public.weekly_check_in_target(target_student_id)) as week_target,
      result.week_start is not null as closed
    from (
      select (month_day::date - 3) as week_start
      from generate_series(month_start::timestamp, month_end::timestamp, interval '1 day') as month_day
      where extract(isodow from month_day) = 4
    ) week_row
    left join public.student_week_results result
      on result.student_id = target_student_id and result.week_start = week_row.week_start
  ) month_week;

  select * into streaks from public.student_streaks(target_student_id, today);

  select coalesce(jsonb_agg(jsonb_build_object(
      'code', achievement.code,
      'period_start', achievement.period_start,
      'earned_at', achievement.earned_at
    ) order by achievement.earned_at), '[]'::jsonb)
  into medals_json
  from public.student_achievements achievement
  where achievement.student_id = target_student_id
    and (
      achievement.period_start = month_start
      or (
        achievement.period_start is null
        and (achievement.earned_at at time zone 'America/Sao_Paulo')::date between month_start and month_end
      )
    );

  select count(*)::integer into lessons_done
  from public.appointments appointment
  where appointment.student_id = target_student_id
    and appointment.status = 'completed'
    and (appointment.starts_at at time zone 'America/Sao_Paulo')::date between month_start and month_end;

  select count(*)::integer into total_check_ins
  from public.student_check_ins check_in
  where check_in.student_id = target_student_id;

  select count(*)::integer into total_lessons
  from public.appointments appointment
  where appointment.student_id = target_student_id and appointment.status = 'completed';

  -- Próxima medalha: a única ainda não conquistada com maior progresso percentual.
  select candidate.code, candidate.current_value, candidate.target_value
  into next_code, next_current, next_target
  from (values
    ('first_check_in', total_check_ins, 1),
    ('streak_4', streaks.streak_best, 4),
    ('streak_8', streaks.streak_best, 8),
    ('streak_12', streaks.streak_best, 12),
    ('check_ins_10', total_check_ins, 10),
    ('check_ins_50', total_check_ins, 50),
    ('check_ins_100', total_check_ins, 100),
    ('lessons_10', total_lessons, 10),
    ('lessons_50', total_lessons, 50),
    ('lessons_100', total_lessons, 100)
  ) as candidate(code, current_value, target_value)
  where not exists (
    select 1
    from public.student_achievements achievement
    where achievement.student_id = target_student_id and achievement.code = candidate.code
  )
  order by candidate.current_value::numeric / candidate.target_value desc, candidate.target_value
  limit 1;

  return jsonb_build_object(
    'month', to_char(month_start, 'YYYY-MM'),
    'in_progress', today < public.month_closes_on(month_start),
    'check_ins', month_check_ins,
    'days', days_json,
    'weeks', weeks_json,
    'streak', jsonb_build_object('current', streaks.streak_now, 'best', streaks.streak_best),
    'achievements', medals_json,
    'next_achievement', case when next_code is null then null else jsonb_build_object(
      'code', next_code, 'current', next_current, 'target', next_target
    ) end,
    'lessons_completed', lessons_done
  );
end;
$$;

-- Funções internas: só rodam pelo cron, pelos gatilhos e pelo próprio relatório.
revoke all on function public.weekly_check_in_target(uuid) from public, anon, authenticated;
revoke all on function public.student_check_ins_in_week(uuid, date) from public, anon, authenticated;
revoke all on function public.student_streaks(uuid, date) from public, anon, authenticated;
revoke all on function public.award_monthly_achievements(uuid, date) from public, anon, authenticated;
revoke all on function public.award_achievements(uuid) from public, anon, authenticated;
revoke all on function public.close_weeks() from public, anon, authenticated;

revoke all on function public.monthly_report(uuid, date) from public, anon;
grant execute on function public.monthly_report(uuid, date) to authenticated;

-- Fechamento toda segunda às 03h de Brasília (06h UTC, pg_cron roda em UTC).
select cron.schedule('dedic-close-weeks', '0 6 * * 1', 'select public.close_weeks();');
