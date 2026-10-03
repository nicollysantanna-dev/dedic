// Gera a migração com os nomes do catálogo no vocabulário dos personais
// (ADR 0011) a partir de supabase/seed/exercise-names.pt-BR.json:
// - `names`: novo name_pt e sinônimos; o nome anterior vira sinônimo, para a
//   busca continuar encontrando — exceto quando ele passou a ser o nome de
//   outro exercício;
// - `retire`: versões com foto de um exercício que já tem GIF; saem da busca e
//   o nome delas vira sinônimo do substituto. Fichas e treinos continuam íntegros.
// Rode sempre depois das migrações do free-exercise-db e do pacote de GIFs,
// que regravam name_pt. Idempotente.
// Uso: node scripts/build-exercise-names-migration.mjs <timestamp>
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!/^\d{14}$/.test(version ?? '')) throw new Error('Informe o timestamp da migração')

const { names, retire } = JSON.parse(
  readFileSync('supabase/seed/exercise-names.pt-BR.json', 'utf8'),
)

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`
const array = (values) => `array[${values.map(quote).join(', ')}]::text[]`

const nameRows = Object.entries(names).map(
  ([externalId, entry]) =>
    `  (${quote(externalId)}, ${quote(entry.name_pt)}, ${array(entry.synonyms ?? [])})`,
)
const retireRows = Object.entries(retire).map(
  ([externalId, replacement]) => `  (${quote(externalId)}, ${quote(replacement)})`,
)

const sql = `-- Nomes do catálogo no vocabulário dos personais (ADR 0011). Gerado
-- automaticamente por scripts/build-exercise-names-migration.mjs a partir de
-- supabase/seed/exercise-names.pt-BR.json; não editar à mão.

-- ${nameRows.length} exercícios renomeados; o nome anterior vira sinônimo.
update public.exercises exercise
set
  synonyms = coalesce((
    select array_agg(distinct synonym order by synonym)
    from unnest(exercise.synonyms || preferred.synonyms || array[exercise.name_pt]) as synonym
    where synonym is not null and synonym <> preferred.name_pt
      and synonym <> all (${array(Object.values(names).map((entry) => entry.name_pt))})
  ), '{}'),
  name_pt = preferred.name_pt
from (values
${nameRows.join(',\n')}
) as preferred (external_id, name_pt, synonyms)
where exercise.external_id = preferred.external_id;

-- ${retireRows.length} versões com foto saem da busca; o nome delas fica como
-- sinônimo do exercício com GIF.
update public.exercises replacement
set synonyms = coalesce((
  select array_agg(distinct synonym order by synonym)
  from unnest(replacement.synonyms || array[duplicate.name_pt]) as synonym
  where synonym is not null and synonym <> replacement.name_pt
), '{}')
from (values
${retireRows.join(',\n')}
) as retired (external_id, replacement_external_id)
join public.exercises duplicate on duplicate.external_id = retired.external_id
where replacement.external_id = retired.replacement_external_id;

update public.exercises exercise
set retired_at = now()
from (values
${retireRows.join(',\n')}
) as retired (external_id, replacement_external_id)
where exercise.external_id = retired.external_id
  and exercise.retired_at is null;
`
const path = `supabase/migrations/${version}_exercise_preferred_names.sql`
writeFileSync(path, sql)
console.log(`${nameRows.length} renomeados e ${retireRows.length} aposentados em ${path}`)
