// Gera a migração de dados do catálogo a partir de supabase/seed/exercises.json
// e exercises.pt-BR.json. Idempotente: reexecutar atualiza nome/classificação.
// Uso: node scripts/build-catalog-migration.mjs <timestamp>
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!/^\d{14}$/.test(version ?? '')) throw new Error('Informe o timestamp da migração')

const exercises = JSON.parse(readFileSync('supabase/seed/exercises.json', 'utf8'))
const translations = JSON.parse(
  readFileSync('supabase/seed/exercises.pt-BR.json', 'utf8'),
)

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`
const array = (values) => `array[${values.map(quote).join(', ')}]::text[]`

const rows = exercises.map(
  (exercise) =>
    `  (${quote(exercise.externalId)}, ${quote(exercise.name)}, ${
      translations[exercise.externalId]
        ? quote(translations[exercise.externalId])
        : 'null'
    }, ${array(exercise.bodyParts)}, ${array(exercise.equipments)}, ${array(
      exercise.targetMuscles,
    )}, ${array(exercise.secondaryMuscles)}, ${array(exercise.instructions)}, ${array(
      exercise.images,
    )})`,
)

const sql = `-- Catálogo free-exercise-db (domínio público) importado por
-- scripts/import-free-exercise-db.mjs. Gerado automaticamente; não editar à mão —
-- ajuste os JSONs em supabase/seed e regenere com build-catalog-migration.mjs.

insert into public.exercises (
  source, external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, instructions, image_paths
)
select 'free_exercise_db', external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, instructions, image_paths
from (values
${rows.join(',\n')}
) as catalog (
  external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, instructions, image_paths
)
on conflict (external_id) where external_id is not null do update set
  name_en = excluded.name_en,
  name_pt = excluded.name_pt,
  body_parts = excluded.body_parts,
  equipments = excluded.equipments,
  target_muscles = excluded.target_muscles,
  secondary_muscles = excluded.secondary_muscles,
  instructions = excluded.instructions,
  image_paths = excluded.image_paths;

-- O catálogo antigo (ExerciseDB) sai de cena: apaga o que ninguém referencia e
-- aposenta o restante, para fichas e treinos existentes continuarem íntegros.
delete from public.exercises exercise
where exercise.source = 'exercisedb'
  and not exists (select 1 from public.routine_exercises where exercise_id = exercise.id)
  and not exists (select 1 from public.workout_exercises where exercise_id = exercise.id)
  and not exists (select 1 from public.exercise_aliases where exercise_id = exercise.id);

update public.exercises set retired_at = now()
where source = 'exercisedb' and retired_at is null;
`
const path = `supabase/migrations/${version}_free_exercise_db_data.sql`
writeFileSync(path, sql)
console.log(`${rows.length} linhas em ${path}`)
