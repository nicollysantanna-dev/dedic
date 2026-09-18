-- Resumo de atividade: valores derivados e isolamento por vínculo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id,
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Sao_Paulo' as slot_a,
  ((current_date + 2)::timestamp + time '11:00') at time zone 'America/Sao_Paulo' as slot_b;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Cenário: Ana com uma aula realizada, uma falta e uma futura; peso registrado hoje.
select pg_temp.login((select trainer_id from ctx));
create temporary table booked as
select
  (public.book_appointment_for_student((select ana_id from ctx), (select slot_a from ctx), gen_random_uuid())).id as done_id,
  (public.book_appointment_for_student((select ana_id from ctx), (select slot_b from ctx), gen_random_uuid())).id as missed_id;
update public.appointments
set starts_at = now() - interval '3 days', ends_at = now() - interval '3 days' + interval '1 hour',
    created_at = now() - interval '4 days', status = 'completed'
where id = (select done_id from booked);
update public.appointments
set starts_at = now() - interval '2 days', ends_at = now() - interval '2 days' + interval '1 hour',
    created_at = now() - interval '4 days', status = 'student_no_show'
where id = (select missed_id from booked);
select public.book_appointment_for_student(
  (select ana_id from ctx), (select slot_a from ctx), gen_random_uuid());
insert into public.progress_entries (student_id, recorded_on, weight_kg, recorded_by)
values ((select ana_id from ctx), current_date, 68, (select trainer_id from ctx));

grant select on ctx to authenticated;
set local role authenticated;
select pg_temp.login((select trainer_id from ctx));

select is(
  (select count(*) from public.student_activity_summary),
  2::bigint,
  'personal vê um resumo por vínculo ativo'
);
select is(
  (select attendance_rate from public.student_activity_summary where student_id = (select ana_id from ctx)),
  50,
  'frequência considera realizadas e faltas, ignorando cancelamentos'
);
select is(
  (select completed_30d from public.student_activity_summary where student_id = (select ana_id from ctx)),
  1,
  'aulas realizadas nos últimos 30 dias'
);
select is(
  (select upcoming_count from public.student_activity_summary where student_id = (select ana_id from ctx)),
  1,
  'próximas aulas contadas'
);
select is(
  (select balance from public.student_activity_summary where student_id = (select ana_id from ctx)),
  7,
  'saldo derivado do extrato (10 - 3 consumos)'
);
select is(
  (select last_progress_on from public.student_activity_summary where student_id = (select ana_id from ctx)),
  current_date,
  'último registro de progresso'
);
select is(
  (select overdue_payments from public.student_activity_summary where student_id = (select ana_id from ctx)),
  0,
  'cobrança pendente dentro do prazo não conta como atrasada'
);

-- Aluna só vê o próprio resumo; sem vínculo, nada.
select pg_temp.login((select ana_id from ctx));
select is(
  (select count(*) from public.student_activity_summary),
  1::bigint,
  'aluna vê apenas o próprio resumo'
);
select pg_temp.login('00000000-0000-4000-8000-000000000004');
select is(
  (select count(*) from public.student_activity_summary),
  0::bigint,
  'sem vínculo não há resumo'
);

select * from finish();
rollback;
