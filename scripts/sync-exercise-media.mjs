// Copia as imagens do free-exercise-db (domínio público) para o bucket
// exercise-media do projeto. Idempotente: pula o que já existe.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-exercise-media.mjs
import { readFileSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')

const source =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const bucket = 'exercise-media'
const concurrency = 8

const supabase = createClient(url, key, { auth: { persistSession: false } })
const exercises = JSON.parse(readFileSync('supabase/seed/exercises.json', 'utf8'))
const paths = exercises.flatMap((exercise) => exercise.images)

// Lista o que já está no bucket (uma pasta por exercício).
const existing = new Set()
const { data: folders, error: listError } = await supabase.storage
  .from(bucket)
  .list('', { limit: 2000 })
if (listError) throw listError
for (const folder of folders ?? []) {
  const { data: files } = await supabase.storage
    .from(bucket)
    .list(folder.name, { limit: 50 })
  for (const file of files ?? []) existing.add(`${folder.name}/${file.name}`)
}

const pending = paths.filter((path) => !existing.has(path))
console.log(`${paths.length} imagens, ${pending.length} a enviar`)

let done = 0
let failed = 0
const worker = async () => {
  while (pending.length > 0) {
    const path = pending.shift()
    try {
      const response = await fetch(source + path)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = Buffer.from(await response.arrayBuffer())
      const { error } = await supabase.storage.from(bucket).upload(path, body, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000',
      })
      if (error) throw error
      done += 1
      if (done % 100 === 0) console.log(`${done} enviadas`)
    } catch (error) {
      failed += 1
      console.error(`falha em ${path}: ${error.message}`)
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker))
console.log(`concluído: ${done} enviadas, ${failed} falhas`)
if (failed > 0) process.exit(1)
