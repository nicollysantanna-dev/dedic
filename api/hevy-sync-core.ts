import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../src/lib/supabase/database.types'
import { normalizeHevyWorkout, type HevyApiWorkout } from './hevy-mapping'

const HEVY_API_BASE_URL = process.env.HEVY_API_BASE_URL ?? 'https://api.hevyapp.com'
const PAGE_SIZE = 10

type HevyWorkoutsResponse = {
  workouts: HevyApiWorkout[]
  page: number
  page_count: number
}

export type SyncPageResult =
  | {
      ok: true
      imported: number
      skipped: number
      errors: string[]
      hasMore: boolean
      nextPage: number | null
    }
  | {
      ok: false
      error: 'INVALID_HEVY_KEY' | 'HEVY_ERROR' | 'HEVY_UNREACHABLE'
      status?: number
      body?: string
    }

/** `null` quando faltar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no ambiente. */
export function createAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}

async function fetchHevyPage(apiKey: string, targetPage: number) {
  const hevyUrl = `${HEVY_API_BASE_URL}/v1/workouts?page=${targetPage}&pageSize=${PAGE_SIZE}`
  console.log('[hevy-sync] fetching', hevyUrl)
  return fetch(hevyUrl, { headers: { 'api-key': apiKey } })
}

async function checkHevyFailure(hevyResponse: Response): Promise<SyncPageResult | null> {
  console.log('[hevy-sync] hevy status', hevyResponse.status)
  if (hevyResponse.status === 401 || hevyResponse.status === 403) {
    return { ok: false, error: 'INVALID_HEVY_KEY' }
  }
  if (!hevyResponse.ok) {
    const bodyText = await hevyResponse.text().catch(() => '')
    console.error('[hevy-sync] HEVY_ERROR', hevyResponse.status, bodyText)
    return { ok: false, error: 'HEVY_ERROR', status: hevyResponse.status, body: bodyText }
  }
  return null
}

/**
 * Sincroniza uma página do histórico do Hevy para um aluno, sempre na ordem
 * do treino mais antigo para o mais novo (ver ADR 0007 — `apply_workout_records`
 * assume importação em ordem cronológica crescente). `requestedPage` nulo é a
 * primeira chamada: descobre o total de páginas via page=1 e já processa a
 * mais antiga (`page_count`); chamadas seguintes usam o `nextPage` devolvido
 * até ele vir `null`.
 *
 * Reaproveitada tanto por `/api/hevy-sync` (uma página por invocação, sob
 * demanda) quanto por `/api/hevy-sync-cron` (todas as páginas de um usuário,
 * uma vez por dia).
 */
export async function syncHevyPage(
  admin: SupabaseClient<Database>,
  studentId: string,
  apiKey: string,
  requestedPage: number | null,
): Promise<SyncPageResult> {
  let payload: HevyWorkoutsResponse
  try {
    if (requestedPage !== null) {
      const page = Math.max(1, requestedPage)
      const hevyResponse = await fetchHevyPage(apiKey, page)
      const failure = await checkHevyFailure(hevyResponse)
      if (failure) return failure
      payload = (await hevyResponse.json()) as HevyWorkoutsResponse
    } else {
      const firstPageResponse = await fetchHevyPage(apiKey, 1)
      const firstFailure = await checkHevyFailure(firstPageResponse)
      if (firstFailure) return firstFailure
      const firstPagePayload = (await firstPageResponse.json()) as HevyWorkoutsResponse
      if (firstPagePayload.page_count > 1) {
        const oldestPageResponse = await fetchHevyPage(
          apiKey,
          firstPagePayload.page_count,
        )
        const oldestFailure = await checkHevyFailure(oldestPageResponse)
        if (oldestFailure) return oldestFailure
        payload = (await oldestPageResponse.json()) as HevyWorkoutsResponse
      } else {
        payload = firstPagePayload
      }
    }
  } catch (fetchError) {
    console.error('[hevy-sync] HEVY_UNREACHABLE', fetchError)
    return { ok: false, error: 'HEVY_UNREACHABLE' }
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

  return {
    ok: true,
    imported,
    skipped,
    errors,
    hasMore: payload.page > 1,
    nextPage: payload.page > 1 ? payload.page - 1 : null,
  }
}

export const SYNC_ERROR_MESSAGES: Record<
  Extract<SyncPageResult, { ok: false }>['error'],
  string
> = {
  INVALID_HEVY_KEY: 'Chave de API inválida ou expirada.',
  HEVY_ERROR: 'Hevy respondeu com erro.',
  HEVY_UNREACHABLE: 'Não foi possível conectar ao Hevy. Tente novamente.',
}
