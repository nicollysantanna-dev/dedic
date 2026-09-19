// Baixa o catálogo gratuito do ExerciseDB e grava supabase/seed/exercises.json.
// Guardamos apenas identificador, nome e classificação (GIF e instruções são
// buscados ao vivo pelo app). Execução: node scripts/import-exercisedb.mjs
import { writeFileSync } from 'node:fs'

const base = 'https://oss.exercisedb.dev/api/v1'
const exercises = []
let cursor = null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// O tier gratuito responde 429 com Retry-After em rajadas; respeitamos e tentamos de novo.
async function fetchWithRetry(url, attempt = 1) {
  const response = await fetch(url)
  if (response.status === 429 && attempt <= 8) {
    const retryAfter = Number(response.headers.get('retry-after') ?? 3)
    await sleep((retryAfter + 1) * 1000)
    return fetchWithRetry(url, attempt + 1)
  }
  if (!response.ok) throw new Error(`ExerciseDB ${response.status}`)
  await sleep(1200)
  return response.json()
}

do {
  const url = new URL(`${base}/exercises`)
  url.searchParams.set('limit', '100')
  // A paginação por cursor usa `after=<último exerciseId>`.
  if (cursor) url.searchParams.set('after', cursor)
  const payload = await fetchWithRetry(url)
  for (const item of payload.data) {
    exercises.push({
      externalId: item.exerciseId,
      name: item.name,
      bodyParts: item.bodyParts,
      equipments: item.equipments,
      targetMuscles: item.targetMuscles,
      secondaryMuscles: item.secondaryMuscles,
    })
  }
  cursor = payload.meta?.hasNextPage ? payload.meta.nextCursor : null
  console.log(`${exercises.length} baixados`)
} while (cursor)

exercises.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync('supabase/seed/exercises.json', JSON.stringify(exercises, null, 2) + '\n')
console.log(`${exercises.length} exercícios gravados`)
