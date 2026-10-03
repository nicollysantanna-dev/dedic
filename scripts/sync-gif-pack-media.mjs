// Envia as animações e miniaturas do pacote de GIFs (ADR 0011), geradas por
// scripts/convert-gif-pack.py, para exercise-media/gif-pack/. Idempotente:
// pula o que já existe no bucket.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-gif-pack-media.mjs <out_dir>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
const mediaDir = process.argv[2]
if (!mediaDir) throw new Error('Informe a pasta gerada por convert-gif-pack.py')

const bucket = 'exercise-media'
const folder = 'gif-pack'
const concurrency = 8

const supabase = createClient(url, key, { auth: { persistSession: false } })
const exercises = JSON.parse(readFileSync('supabase/seed/gif-pack.json', 'utf8'))
const files = exercises.flatMap((exercise) => [
  `${exercise.slug}.webp`,
  `${exercise.slug}.thumb.webp`,
])

const existing = new Set()
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000, offset })
  if (error) throw error
  for (const file of data ?? []) existing.add(file.name)
  if (!data || data.length < 1000) break
}

const pending = files.filter((file) => !existing.has(file))
console.log(`${files.length} arquivos, ${pending.length} a enviar`)

let done = 0
let failed = 0
const worker = async () => {
  while (pending.length > 0) {
    const file = pending.shift()
    try {
      const body = readFileSync(join(mediaDir, file))
      const { error } = await supabase.storage
        .from(bucket)
        .upload(`${folder}/${file}`, body, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        })
      if (error) throw error
      done += 1
      if (done % 100 === 0) console.log(`${done} enviados`)
    } catch (error) {
      failed += 1
      console.error(`falha em ${file}: ${error.message}`)
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker))
console.log(`concluído: ${done} enviados, ${failed} falhas`)
if (failed > 0) process.exit(1)
