-- Ordenação livre das fichas (item 0032). A ordem vale dentro de cada lista:
-- o escopo é o par (personal, aluno). Fichas novas entram no topo da lista.

alter table public.routines add column position integer not null default 0;

-- Preserva a ordem que o aluno já vê hoje: mais recente primeiro.
update public.routines routine
set position = numbered.rn - 1
from (
  select id, row_number() over (
    partition by trainer_id, student_id order by created_at desc, id
  ) as rn
  from public.routines
) numbered
where routine.id = numbered.id;

create index routines_order_idx on public.routines (trainer_id, student_id, position);

-- Ficha nova vai para o topo do seu escopo.
create function public.routine_position_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.position := coalesce(
    (
      select min(routine.position) - 1
      from public.routines routine
      where routine.trainer_id is not distinct from new.trainer_id
        and routine.student_id is not distinct from new.student_id
    ),
    0
  );
  return new;
end;
$$;

create trigger routines_position_on_insert
before insert on public.routines
for each row execute function public.routine_position_on_insert();

-- Grava a nova ordem de uma lista inteira em uma transação. Só fichas que o próprio
-- usuário pode ver e editar (mesma regra de save_routine e archive_routine).
create function public.reorder_routines(ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  accessible_count integer;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if ordered_ids is null or cardinality(ordered_ids) = 0 then
    raise exception 'ROUTINE_ORDER_EMPTY';
  end if;
  if (select count(distinct item) from unnest(ordered_ids) as item) <> cardinality(ordered_ids) then
    raise exception 'ROUTINE_ORDER_DUPLICATED';
  end if;

  select count(*) into accessible_count
  from public.routines routine
  where routine.id = any(ordered_ids)
    and routine.archived_at is null
    and (routine.trainer_id = actor or routine.student_id = actor);
  if accessible_count <> cardinality(ordered_ids) then
    raise exception 'ROUTINE_NOT_FOUND';
  end if;

  update public.routines routine
  set position = ordered.ord - 1
  from unnest(ordered_ids) with ordinality as ordered(id, ord)
  where routine.id = ordered.id;
end;
$$;

revoke all on function public.routine_position_on_insert() from public, anon;
revoke all on function public.reorder_routines(uuid[]) from public, anon;
grant execute on function public.reorder_routines(uuid[]) to authenticated;
