import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../src/lib/supabase/database.types'
import { normalizeHevyWorkout, type HevyApiWorkout } from './hevy-mapping'

const HEVY_API_BASE_URL = process.env.HEVY_API_BASE_URL ?? 'https://api.hevyapp.com'
const PAGE_SIZE = 10

type HevyWorkoutsResponse = {
  workouts: HevyApiWorkout[]
  page: number
  page_count: number
}

/**
 * Sincroniza uma página do histórico de treinos do Hevy para o aluno
 * autenticado. Chamada sob demanda pelo botão "Sincronizar agora" — sem
 * agendamento automático (ver ADR 0007). Paginável: o cliente chama de novo
 * com `page` incrementado enquanto `hasMore` vier true.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await handleSync(req, res)
  } catch (error) {
    console.error('[hevy-sync] unhandled error', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    return
  }

  const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!accessToken) {
    res.status(401).json({ error: 'AUTH_REQUIRED' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' })
    return
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
  if (userError || !userData.user) {
    console.error('[hevy-sync] INVALID_TOKEN', userError)
    res.status(401).json({ error: 'INVALID_TOKEN' })
    return
  }
  const studentId = userData.user.id

  const { data: apiKey, error: apiKeyError } = await admin.rpc('get_hevy_api_key', {
    target_user_id: studentId,
  })
  if (apiKeyError) {
    console.error('[hevy-sync] CONNECTION_LOOKUP_FAILED', apiKeyError)
    res
      .status(500)
      .json({ error: 'CONNECTION_LOOKUP_FAILED', message: apiKeyError.message })
    return
  }
  if (!apiKey) {
    console.error('[hevy-sync] NOT_CONNECTED for student', studentId)
    res.status(409).json({ error: 'NOT_CONNECTED' })
    return
  }

  // O Hevy pagina do treino mais recente para o mais antigo (page=1 = mais
  // novos). apply_workout_records assume importação em ordem cronológica
  // crescente para calcular recordes sem precisar reconstruir tudo — então
  // aqui sincronizamos das páginas mais antigas para as mais novas: na
  // primeira chamada (sem `page` no corpo), descobrimos o total de páginas e
  // já processamos a mais antiga; as chamadas seguintes vão descendo
  // (`nextPage`) até chegar à página 1.
  const requestBody: unknown = req.body
  const requestedPage =
    typeof requestBody === 'object' && requestBody !== null && 'page' in requestBody
      ? Number(requestBody.page)
      : null

  const fetchHevyPage = async (targetPage: number) => {
    const hevyUrl = `${HEVY_API_BASE_URL}/v1/workouts?page=${targetPage}&pageSize=${PAGE_SIZE}`
    console.log('[hevy-sync] fetching', hevyUrl)
    return fetch(hevyUrl, { headers: { 'api-key': apiKey } })
  }

  const handleHevyFailure = async (hevyResponse: Response): Promise<boolean> => {
    if (hevyResponse.status === 401 || hevyResponse.status === 403) {
      await admin.rpc('record_hevy_sync_result', {
        target_user_id: studentId,
        sync_status: 'error',
        sync_error: 'Chave de API inválida ou expirada.',
      })
      res.status(502).json({ error: 'INVALID_HEVY_KEY' })
      return true
    }
    if (!hevyResponse.ok) {
      const bodyText = await hevyResponse.text().catch(() => '')
      console.error('[hevy-sync] HEVY_ERROR', hevyResponse.status, bodyText)
      await admin.rpc('record_hevy_sync_result', {
        target_user_id: studentId,
        sync_status: 'error',
        sync_error: `Hevy respondeu com status ${hevyResponse.status}.`,
      })
      res
        .status(502)
        .json({ error: 'HEVY_ERROR', status: hevyResponse.status, body: bodyText })
      return true
    }
    return false
  }

  let payload: HevyWorkoutsResponse
  try {
    if (requestedPage !== null && Number.isFinite(requestedPage)) {
      const page = Math.max(1, requestedPage)
      const hevyResponse = await fetchHevyPage(page)
      console.log('[hevy-sync] hevy status', hevyResponse.status)
      if (await handleHevyFailure(hevyResponse)) return
      payload = (await hevyResponse.json()) as HevyWorkoutsResponse
    } else {
      // Primeira chamada: descobre o total de páginas via page=1 e, se houver
      // mais de uma, já busca a mais antiga (page_count) em vez de importar
      // esta (mais recente) fora de ordem.
      const firstPageResponse = await fetchHevyPage(1)
      console.log('[hevy-sync] hevy status', firstPageResponse.status)
      if (await handleHevyFailure(firstPageResponse)) return
      const firstPagePayload = (await firstPageResponse.json()) as HevyWorkoutsResponse
      if (firstPagePayload.page_count > 1) {
        const oldestPageResponse = await fetchHevyPage(firstPagePayload.page_count)
        console.log('[hevy-sync] hevy status', oldestPageResponse.status)
        if (await handleHevyFailure(oldestPageResponse)) return
        payload = (await oldestPageResponse.json()) as HevyWorkoutsResponse
      } else {
        payload = firstPagePayload
      }
    }
  } catch (fetchError) {
    console.error('[hevy-sync] HEVY_UNREACHABLE', fetchError)
    await admin.rpc('record_hevy_sync_result', {
      target_user_id: studentId,
      sync_status: 'error',
      sync_error: 'Não foi possível conectar ao Hevy. Tente novamente.',
    })
    res.status(502).json({ error: 'HEVY_UNREACHABLE' })
    return
  }

  console.log('[hevy-sync] payload workouts count', payload.workouts?.length)
  const workouts = [...(payload.workouts ?? [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  const { data: latestWorkout } = await admin
    .from('workouts')
    .select('finished_at')
    .eq('student_id', studentId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const priorMaxFinishedAt = latestWorkout?.finished_at
    ? new Date(latestWorkout.finished_at).getTime()
    : 0

  let imported = 0
  let skipped = 0
  const errors: string[] = []
  let minImportedFinishedAt: number | null = null

  for (const workout of workouts) {
    const normalized = normalizeHevyWorkout(workout)
    const { error } = await admin.rpc('import_hevy_workout', {
      target_student_id: studentId,
      target_hevy_workout_id: workout.id,
      payload: normalized,
    })
    if (error) {
      skipped += 1
      errors.push(error.message)
      continue
    }
    imported += 1
    const finishedAt = new Date(normalized.finished_at).getTime()
    if (minImportedFinishedAt === null || finishedAt < minImportedFinishedAt) {
      minImportedFinishedAt = finishedAt
    }
  }

  // Só reconstrói recordes quando um treino importado é mais antigo que o
  // histórico já existente — o caso comum (sincronização traz só treinos mais
  // novos) não precisa disso, apply_workout_records já resolve corretamente.
  if (minImportedFinishedAt !== null && minImportedFinishedAt < priorMaxFinishedAt) {
    await admin.rpc('recompute_workout_records', { target_student_id: studentId })
  }

  await admin.rpc('record_hevy_sync_result', {
    target_user_id: studentId,
    sync_status: errors.length > 0 && imported === 0 ? 'error' : 'ok',
    sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
  })

  // Vamos descendo de payload.page_count até a página 1 (a mais recente).
  res.status(200).json({
    imported,
    skipped,
    errors,
    hasMore: payload.page > 1,
    nextPage: payload.page > 1 ? payload.page - 1 : null,
  })
}
