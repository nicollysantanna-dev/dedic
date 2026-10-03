-- Nomes do catálogo no vocabulário dos personais (ADR 0011). Gerado
-- automaticamente por scripts/build-exercise-names-migration.mjs a partir de
-- supabase/seed/exercise-names.pt-BR.json; não editar à mão.

-- 84 exercícios renomeados; o nome anterior vira sinônimo.
update public.exercises exercise
set
  synonyms = coalesce((
    select array_agg(distinct synonym order by synonym)
    from unnest(exercise.synonyms || preferred.synonyms || array[exercise.name_pt]) as synonym
    where synonym is not null and synonym <> preferred.name_pt
      and synonym <> all (array['Rosca direta barra W', 'Rosca alternada', 'Rosca simultânea', 'Rosca Scott barra W', 'Rosca Scott máquina', 'Rosca inclinada com halteres', 'Rosca na polia baixa', 'Rosca unilateral na polia', 'Rosca inversa', 'Tríceps pulley barra reta', 'Tríceps pulley corda', 'Tríceps pulley barra V', 'Tríceps francês unilateral', 'Tríceps francês bilateral', 'Tríceps coice', 'Supino pegada fechada', 'Tríceps máquina', 'Tríceps unilateral na polia', 'Desenvolvimento com halteres', 'Desenvolvimento com barra', 'Desenvolvimento máquina', 'Desenvolvimento militar', 'Elevação lateral na polia', 'Elevação lateral máquina', 'Elevação frontal na polia', 'Crucifixo inverso máquina', 'Remada alta', 'Agachamento livre', 'Agachamento livre sem peso', 'Agachamento frontal', 'Agachamento hack', 'Agachamento goblet', 'Leg press 45°', 'Passada', 'Afundo búlgaro', 'Step-up', 'Elevação pélvica com barra', 'Coice na polia', 'Coice máquina', 'Abdução na polia', 'Adução na polia', 'Flexora unilateral', 'Good morning', 'Nordic curl', 'Ponte de glúteos', 'Panturrilha em pé', 'Panturrilha máquina em pé', 'Panturrilha sentada', 'Panturrilha no Smith', 'Panturrilha unilateral em pé', 'Abdominal tradicional', 'Abdominal máquina', 'Abdominal na polia', 'Abdominal infra', 'Elevação de pernas', 'Elevação de joelhos', 'Abdominal remador', 'Abdominal oblíquo', 'Russian twist', 'Mountain climber', 'Rosca de punho', 'Rosca de punho inversa', 'Farmer''s walk', 'Suspensão na barra', 'Supino declinado', 'Supino máquina', 'Supino no Smith', 'Crucifixo inclinado', 'Crucifixo na máquina', 'Crossover na polia alta', 'Crossover na polia média', 'Pullover com halter', 'Puxada frontal aberta', 'Puxada frontal fechada', 'Puxada pegada neutra', 'Puxada supinada', 'Barra fixa pronada', 'Remada baixa', 'Remada unilateral com halter', 'Remada cavalinho', 'Remada articulada máquina', 'Remada unilateral na polia', 'Pullover na polia', 'Levantamento terra']::text[])
  ), '{}'),
  name_pt = preferred.name_pt
from (values
  ('EZ-Bar_Curl', 'Rosca direta barra W', array[]::text[]),
  ('Dumbbell_Alternate_Bicep_Curl', 'Rosca alternada', array[]::text[]),
  ('Dumbbell_Bicep_Curl', 'Rosca simultânea', array[]::text[]),
  ('gif-pack:ez-bar-preacher-curl', 'Rosca Scott barra W', array[]::text[]),
  ('Machine_Preacher_Curls', 'Rosca Scott máquina', array[]::text[]),
  ('Incline_Dumbbell_Curl', 'Rosca inclinada com halteres', array[]::text[]),
  ('Standing_Biceps_Cable_Curl', 'Rosca na polia baixa', array[]::text[]),
  ('Standing_One-Arm_Cable_Curl', 'Rosca unilateral na polia', array[]::text[]),
  ('Reverse_Barbell_Curl', 'Rosca inversa', array[]::text[]),
  ('Triceps_Pushdown', 'Tríceps pulley barra reta', array[]::text[]),
  ('Triceps_Pushdown_-_Rope_Attachment', 'Tríceps pulley corda', array[]::text[]),
  ('Triceps_Pushdown_-_V-Bar_Attachment', 'Tríceps pulley barra V', array[]::text[]),
  ('Standing_One-Arm_Dumbbell_Triceps_Extension', 'Tríceps francês unilateral', array[]::text[]),
  ('Standing_Dumbbell_Triceps_Extension', 'Tríceps francês bilateral', array[]::text[]),
  ('gif-pack:one-arm-dumbbell-triceps-kickback-bench-supported', 'Tríceps coice', array[]::text[]),
  ('Close-Grip_Barbell_Bench_Press', 'Supino pegada fechada', array[]::text[]),
  ('gif-pack:plate-loaded-seated-dip-machine', 'Tríceps máquina', array[]::text[]),
  ('Cable_One_Arm_Tricep_Extension', 'Tríceps unilateral na polia', array[]::text[]),
  ('Seated_Dumbbell_Press', 'Desenvolvimento com halteres', array[]::text[]),
  ('Seated_Barbell_Military_Press', 'Desenvolvimento com barra', array[]::text[]),
  ('Machine_Shoulder_Military_Press', 'Desenvolvimento máquina', array[]::text[]),
  ('Standing_Military_Press', 'Desenvolvimento militar', array[]::text[]),
  ('gif-pack:cable-one-arm-lateral-raise', 'Elevação lateral na polia', array[]::text[]),
  ('gif-pack:machine-lateral-raise', 'Elevação lateral máquina', array[]::text[]),
  ('Standing_Low-Pulley_Deltoid_Raise', 'Elevação frontal na polia', array[]::text[]),
  ('Reverse_Machine_Flyes', 'Crucifixo inverso máquina', array[]::text[]),
  ('Upright_Barbell_Row', 'Remada alta', array[]::text[]),
  ('Barbell_Full_Squat', 'Agachamento livre', array[]::text[]),
  ('Bodyweight_Squat', 'Agachamento livre sem peso', array[]::text[]),
  ('Front_Barbell_Squat', 'Agachamento frontal', array[]::text[]),
  ('Hack_Squat', 'Agachamento hack', array[]::text[]),
  ('gif-pack:dumbbell-goblet-squat', 'Agachamento goblet', array[]::text[]),
  ('Leg_Press', 'Leg press 45°', array[]::text[]),
  ('Bodyweight_Walking_Lunge', 'Passada', array['Avanço']::text[]),
  ('Split_Squats', 'Afundo búlgaro', array[]::text[]),
  ('Dumbbell_Step_Ups', 'Step-up', array['Subida no banco']::text[]),
  ('Barbell_Hip_Thrust', 'Elevação pélvica com barra', array['Hip thrust']::text[]),
  ('One-Legged_Cable_Kickback', 'Coice na polia', array['Extensão de quadril na polia']::text[]),
  ('gif-pack:standing-machine-glute-kickback', 'Coice máquina', array[]::text[]),
  ('gif-pack:cable-hip-abduction', 'Abdução na polia', array[]::text[]),
  ('Cable_Hip_Adduction', 'Adução na polia', array[]::text[]),
  ('gif-pack:single-leg-lying-leg-curl', 'Flexora unilateral', array[]::text[]),
  ('Good_Morning', 'Good morning', array[]::text[]),
  ('gif-pack:nordic-hamstring-curl', 'Nordic curl', array[]::text[]),
  ('Butt_Lift_Bridge', 'Ponte de glúteos', array[]::text[]),
  ('gif-pack:bodyweight-standing-calf-raise-on-stairs', 'Panturrilha em pé', array[]::text[]),
  ('Standing_Calf_Raises', 'Panturrilha máquina em pé', array[]::text[]),
  ('Seated_Calf_Raise', 'Panturrilha sentada', array['Panturrilha máquina sentada']::text[]),
  ('Smith_Machine_Calf_Raise', 'Panturrilha no Smith', array[]::text[]),
  ('gif-pack:single-leg-standing-calf-raise', 'Panturrilha unilateral em pé', array[]::text[]),
  ('Crunches', 'Abdominal tradicional', array[]::text[]),
  ('Ab_Crunch_Machine', 'Abdominal máquina', array[]::text[]),
  ('Cable_Crunch', 'Abdominal na polia', array[]::text[]),
  ('Reverse_Crunch', 'Abdominal infra', array[]::text[]),
  ('gif-pack:lying-leg-raise', 'Elevação de pernas', array[]::text[]),
  ('gif-pack:hanging-knee-raise', 'Elevação de joelhos', array[]::text[]),
  ('gif-pack:tuck-up-v-sit-tuck', 'Abdominal remador', array[]::text[]),
  ('gif-pack:oblique-knee-to-elbow-crunch', 'Abdominal oblíquo', array[]::text[]),
  ('Russian_Twist', 'Russian twist', array[]::text[]),
  ('Mountain_Climbers', 'Mountain climber', array[]::text[]),
  ('gif-pack:barbell-wrist-curl-over-bench', 'Rosca de punho', array[]::text[]),
  ('Palms-Down_Wrist_Curl_Over_A_Bench', 'Rosca de punho inversa', array[]::text[]),
  ('Farmers_Walk', 'Farmer''s walk', array[]::text[]),
  ('gif-pack:dead-hang', 'Suspensão na barra', array[]::text[]),
  ('Decline_Barbell_Bench_Press', 'Supino declinado', array[]::text[]),
  ('Machine_Bench_Press', 'Supino máquina', array[]::text[]),
  ('Smith_Machine_Bench_Press', 'Supino no Smith', array[]::text[]),
  ('Incline_Dumbbell_Flyes', 'Crucifixo inclinado', array[]::text[]),
  ('Butterfly', 'Crucifixo na máquina', array['Peck deck', 'Voador']::text[]),
  ('Cable_Crossover', 'Crossover na polia alta', array[]::text[]),
  ('gif-pack:standing-cable-fly-mid-pulley', 'Crossover na polia média', array[]::text[]),
  ('gif-pack:lying-dumbbell-pullover', 'Pullover com halter', array[]::text[]),
  ('Wide-Grip_Lat_Pulldown', 'Puxada frontal aberta', array[]::text[]),
  ('Close-Grip_Front_Lat_Pulldown', 'Puxada frontal fechada', array[]::text[]),
  ('V-Bar_Pulldown', 'Puxada pegada neutra', array['Puxada com triângulo']::text[]),
  ('Underhand_Cable_Pulldowns', 'Puxada supinada', array[]::text[]),
  ('Pullups', 'Barra fixa pronada', array[]::text[]),
  ('Seated_Cable_Rows', 'Remada baixa', array[]::text[]),
  ('One-Arm_Dumbbell_Row', 'Remada unilateral com halter', array['Serrote']::text[]),
  ('T-Bar_Row_with_Handle', 'Remada cavalinho', array['Barra T']::text[]),
  ('gif-pack:plate-loaded-chest-supported-row', 'Remada articulada máquina', array[]::text[]),
  ('Seated_One-arm_Cable_Pulley_Rows', 'Remada unilateral na polia', array[]::text[]),
  ('Rope_Straight-Arm_Pulldown', 'Pullover na polia', array[]::text[]),
  ('Barbell_Deadlift', 'Levantamento terra', array[]::text[])
) as preferred (external_id, name_pt, synonyms)
where exercise.external_id = preferred.external_id;

-- 9 versões com foto saem da busca; o nome delas fica como
-- sinônimo do exercício com GIF.
update public.exercises replacement
set synonyms = coalesce((
  select array_agg(distinct synonym order by synonym)
  from unnest(replacement.synonyms || array[duplicate.name_pt]) as synonym
  where synonym is not null and synonym <> replacement.name_pt
), '{}')
from (values
  ('Barbell_Shoulder_Press', 'Seated_Barbell_Military_Press'),
  ('Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press'),
  ('Goblet_Squat', 'gif-pack:dumbbell-goblet-squat'),
  ('Oblique_Crunches', 'gif-pack:oblique-knee-to-elbow-crunch'),
  ('Bodyweight_Mid_Row', 'Inverted_Row'),
  ('Decline_Smith_Press', 'Smith_Machine_Decline_Press'),
  ('EZ-Bar_Skullcrusher', 'Lying_Triceps_Press'),
  ('Straight-Arm_Dumbbell_Pullover', 'gif-pack:lying-dumbbell-pullover'),
  ('Leverage_Iso_Row', 'gif-pack:plate-loaded-chest-supported-row')
) as retired (external_id, replacement_external_id)
join public.exercises duplicate on duplicate.external_id = retired.external_id
where replacement.external_id = retired.replacement_external_id;

update public.exercises exercise
set retired_at = now()
from (values
  ('Barbell_Shoulder_Press', 'Seated_Barbell_Military_Press'),
  ('Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press'),
  ('Goblet_Squat', 'gif-pack:dumbbell-goblet-squat'),
  ('Oblique_Crunches', 'gif-pack:oblique-knee-to-elbow-crunch'),
  ('Bodyweight_Mid_Row', 'Inverted_Row'),
  ('Decline_Smith_Press', 'Smith_Machine_Decline_Press'),
  ('EZ-Bar_Skullcrusher', 'Lying_Triceps_Press'),
  ('Straight-Arm_Dumbbell_Pullover', 'gif-pack:lying-dumbbell-pullover'),
  ('Leverage_Iso_Row', 'gif-pack:plate-loaded-chest-supported-row')
) as retired (external_id, replacement_external_id)
where exercise.external_id = retired.external_id
  and exercise.retired_at is null;
