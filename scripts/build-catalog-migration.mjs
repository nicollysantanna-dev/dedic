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
    )}, ${array(exercise.secondaryMuscles)})`,
)

const sql = `-- Catálogo ExerciseDB (tier gratuito) importado por scripts/import-exercisedb.mjs
-- e traduzido por scripts/translate-exercises.mjs. Gerado automaticamente; não editar
-- à mão — ajuste os JSONs em supabase/seed e regenere com build-catalog-migration.mjs.

insert into public.exercises (
  source, external_id, name_en, name_pt, body_parts, equipments, target_muscles, secondary_muscles
)
select 'exercisedb', external_id, name_en, name_pt, body_parts, equipments, target_muscles, secondary_muscles
from (values
${rows.join(',\n')}
) as catalog (external_id, name_en, name_pt, body_parts, equipments, target_muscles, secondary_muscles)
on conflict (external_id) where external_id is not null do update set
  name_en = excluded.name_en,
  name_pt = excluded.name_pt,
  body_parts = excluded.body_parts,
  equipments = excluded.equipments,
  target_muscles = excluded.target_muscles,
  secondary_muscles = excluded.secondary_muscles;
`
const path = `supabase/migrations/${version}_exercise_catalog_data.sql`
writeFileSync(path, sql)
console.log(`${rows.length} linhas em ${path}`)
