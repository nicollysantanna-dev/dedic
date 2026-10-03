// Gera a migração de dados do pacote de GIFs (ADR 0011) a partir de
// supabase/seed/gif-pack.json. Exercícios "new" entram no catálogo como
// gif_pack; os "match" colocam a animação num exercício do free-exercise-db e
// trocam a foto pela miniatura do GIF. Idempotente.
// Uso: node scripts/build-gif-pack-migration.mjs <timestamp>
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!/^\d{14}$/.test(version ?? '')) throw new Error('Informe o timestamp da migração')

const exercises = JSON.parse(readFileSync('supabase/seed/gif-pack.json', 'utf8'))

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`
const array = (values) => `array[${values.map(quote).join(', ')}]::text[]`
const animation = (exercise) => quote(`gif-pack/${exercise.slug}.webp`)
const thumb = (exercise) => array([`gif-pack/${exercise.slug}.thumb.webp`])

const created = exercises.filter((exercise) => exercise.decision === 'new')
const matched = exercises.filter((exercise) => exercise.decision === 'match')

const createdRows = created.map(
  (exercise) =>
    `  (${quote(`gif-pack:${exercise.slug}`)}, ${quote(exercise.name_en)}, ${quote(
      exercise.name_pt,
    )}, ${array(exercise.body_parts)}, ${array(exercise.equipments)}, ${array(
      exercise.target_muscles,
    )}, ${array(exercise.secondary_muscles)}, ${thumb(exercise)}, ${animation(exercise)})`,
)

const matchedRows = matched.map(
  (exercise) =>
    `  (${quote(exercise.external_id)}, ${thumb(exercise)}, ${animation(exercise)})`,
)

const sql = `-- Pacote de GIFs animados (ADR 0011). Gerado automaticamente por
-- scripts/build-gif-pack-migration.mjs a partir de supabase/seed/gif-pack.json;
-- não editar à mão. As mídias vão para o bucket com sync-gif-pack-media.mjs.

-- ${created.length} exercícios novos no catálogo.
insert into public.exercises (
  source, external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, image_paths, animation_path
)
select 'gif_pack', external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, image_paths, animation_path
from (values
${createdRows.join(',\n')}
) as pack (
  external_id, name_en, name_pt, body_parts, equipments, target_muscles,
  secondary_muscles, image_paths, animation_path
)
on conflict (external_id) where external_id is not null do update set
  name_en = excluded.name_en,
  name_pt = excluded.name_pt,
  body_parts = excluded.body_parts,
  equipments = excluded.equipments,
  target_muscles = excluded.target_muscles,
  secondary_muscles = excluded.secondary_muscles,
  image_paths = excluded.image_paths,
  animation_path = excluded.animation_path;

-- ${matched.length} exercícios do free-exercise-db ganham a animação; a miniatura
-- do GIF substitui as fotos para o catálogo ficar padronizado.
update public.exercises exercise
set image_paths = pack.image_paths, animation_path = pack.animation_path
from (values
${matchedRows.join(',\n')}
) as pack (external_id, image_paths, animation_path)
where exercise.external_id = pack.external_id
  and exercise.source = 'free_exercise_db';
`
const path = `supabase/migrations/${version}_gif_pack_data.sql`
writeFileSync(path, sql)
console.log(`${created.length} novos e ${matched.length} casados em ${path}`)
