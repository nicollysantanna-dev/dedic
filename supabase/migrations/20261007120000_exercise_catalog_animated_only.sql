-- Catálogo só com GIF animado 3D (ADR 0012): exercícios globais sem animação
-- (fotos de pessoas do free-exercise-db) são aposentados. Fichas, treinos e
-- históricos que já os usam continuam íntegros; nada é apagado.

-- Duplicatas reais: o nome da versão com foto vira sinônimo da versão com GIF,
-- para a busca continuar encontrando.
update public.exercises replacement
set synonyms = coalesce((
  select array_agg(distinct synonym order by synonym)
  from unnest(replacement.synonyms || array[duplicate.name_pt]) as synonym
  where synonym is not null and synonym <> replacement.name_pt
), '{}')
from (values
  ('Barbell_Squat', 'Barbell_Full_Squat'),
  ('Front_Squat_Clean_Grip', 'Front_Barbell_Squat'),
  ('Triceps_Overhead_Extension_with_Rope', 'Cable_Rope_Overhead_Triceps_Extension'),
  ('Lying_Triceps_Press', 'gif-pack:lying-barbell-triceps-extension'),
  ('Tricep_Dumbbell_Kickback', 'gif-pack:one-arm-dumbbell-triceps-kickback-bench-supported'),
  ('Dips_-_Triceps_Version', 'Parallel_Bar_Dip'),
  ('Incline_Push-Up_Medium', 'Incline_Push-Up'),
  ('Oblique_Crunches_-_On_The_Floor', 'gif-pack:oblique-knee-to-elbow-crunch'),
  ('Band_Good_Morning', 'Band_Good_Morning_Pull_Through'),
  ('Zottman_Curl', 'gif-pack:seated-dumbbell-zottman-curl'),
  ('Leverage_Shoulder_Press', 'Machine_Shoulder_Military_Press'),
  ('Straight-Arm_Pulldown', 'Rope_Straight-Arm_Pulldown'),
  ('Jogging_Treadmill', 'Running_Treadmill'),
  ('Walking_Treadmill', 'gif-pack:walking')
) as retired (external_id, replacement_external_id)
join public.exercises duplicate on duplicate.external_id = retired.external_id
where replacement.external_id = retired.replacement_external_id
  and duplicate.retired_at is null;

update public.exercises
set retired_at = now()
where owner_id is null
  and animation_path is null
  and retired_at is null;

-- Daqui em diante, o catálogo global ativo só aceita exercício animado.
alter table public.exercises
  add constraint exercises_catalog_animated
  check (owner_id is not null or retired_at is not null or animation_path is not null);
