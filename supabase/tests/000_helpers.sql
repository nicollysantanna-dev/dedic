-- Verificação de infraestrutura: pgTAP disponível e seed aplicado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select has_extension('pgtap', 'pgTAP está instalado');
select is(
  (select count(*) from public.profiles),
  4::bigint,
  'seed criou os quatro perfis'
);
select is(
  (select count(*) from public.trainer_student_relationships where status = 'active'),
  2::bigint,
  'seed criou dois vínculos ativos'
);
select is(
  (select count(*) from public.availability_rules
   where trainer_id = '00000000-0000-4000-8000-000000000001'),
  7::bigint,
  'seed publicou disponibilidade em todos os dias'
);

select * from finish();
rollback;
