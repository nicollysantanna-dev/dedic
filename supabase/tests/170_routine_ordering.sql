-- Ordenação livre das fichas (item 0032): troca de posições, autorização e fichas novas no topo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table ctx as
select
  '00000000-0000-4000-8000-000000000001'::uuid as trainer_id,
  '00000000-0000-4000-8000-000000000002'::uuid as ana_id,
  '00000000-0000-4000-8000-000000000003'::uuid as bruno_id;
grant select on ctx to authenticated, service_role;

create temporary table ids (key text primary key, id uuid);
grant select on ids to authenticated, service_role;

create function pg_temp.login(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true);
$$;

-- Arrange (como postgres): três fichas da Ana, na ordem em que foram criadas, e uma do Bruno.
with created as (
  insert into public.routines (trainer_id, student_id, name, created_by)
  select trainer_id, ana_id, name, trainer_id
  from ctx, (values ('Sexta'), ('Terça'), ('Quarta')) as names(name)
  returning id, name
)
insert into ids (key, id) select name, id from created;

with created as (
  insert into public.routines (trainer_id, student_id, name, created_by)
  select trainer_id, bruno_id, 'Segunda', trainer_id from ctx
  returning id, name
)
insert into ids (key, id) select name, id from created;

-- Fichas novas entram no topo: a última criada (Quarta) fica primeiro.
select is(
  (select array_agg(name order by position) from public.routines
    where student_id = (select ana_id from ctx)),
  array['Quarta', 'Terça', 'Sexta'],
  'fichas novas aparecem no topo da lista');

select pg_temp.login((select ana_id from ctx));
select lives_ok(
  $$ select public.reorder_routines(array[
       (select id from ids where key = 'Sexta'),
       (select id from ids where key = 'Quarta'),
       (select id from ids where key = 'Terça')]) $$,
  'aluna reordena as próprias fichas');
select is(
  (select array_agg(name order by position) from public.routines
    where student_id = (select ana_id from ctx)),
  array['Sexta', 'Quarta', 'Terça'],
  'a nova ordem fica salva');

select throws_ok(
  $$ select public.reorder_routines(array[
       (select id from ids where key = 'Sexta'),
       (select id from ids where key = 'Sexta')]) $$,
  'ROUTINE_ORDER_DUPLICATED', 'não aceita a mesma ficha duas vezes');
select throws_ok(
  $$ select public.reorder_routines('{}'::uuid[]) $$,
  'ROUTINE_ORDER_EMPTY', 'não aceita lista vazia');

select pg_temp.login((select bruno_id from ctx));
select throws_ok(
  $$ select public.reorder_routines(array[(select id from ids where key = 'Sexta')]) $$,
  'ROUTINE_NOT_FOUND', 'aluno sem vínculo não reordena fichas de outro aluno');

select pg_temp.login((select trainer_id from ctx));
select lives_ok(
  $$ select public.reorder_routines(array[
       (select id from ids where key = 'Terça'),
       (select id from ids where key = 'Sexta'),
       (select id from ids where key = 'Quarta')]) $$,
  'personal reordena as fichas dos seus alunos');

-- Uma ficha criada depois de uma reordenação continua no topo.
insert into public.routines (trainer_id, student_id, name, created_by)
select trainer_id, ana_id, 'Domingo', trainer_id from ctx;
select is(
  (select name from public.routines
    where student_id = (select ana_id from ctx) and archived_at is null
    order by position limit 1),
  'Domingo', 'ficha criada depois de reordenar volta para o topo');

select * from finish();
rollback;
