import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../src/lib/supabase/database.types'
import { createAdminClient, syncHevyPage } from './hevy-sync-core'

type UserSyncSummary = {
  userId: string
  imported: number
  skipped: number
  error?: string
}

/**
 * Disparado uma vez por dia pelo Vercel Cron (ver `crons` em `vercel.json`) —
 * sincroniza todo mundo com conta Hevy conectada, um usuário de cada vez,
 * reaproveitando a mesma `syncHevyPage` do endpoint manual
 * (`/api/hevy-sync.ts`, ver ADR 0007). Falha de um usuário não interrompe os
 * demais; cada um é registrado via `record_hevy_sync_result`, do mesmo jeito
 * que uma sincronização manual — o card em Conta → Integrações não distingue
 * a origem.
 *
 * Protegido por `CRON_SECRET`: o Vercel injeta esse valor como
 * `Authorization: Bearer <CRON_SECRET>` nas chamadas agendadas; qualquer
 * outra chamada sem o segredo correto é rejeitada.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' })
    return
  }

  const { data: connections, error: connectionsError } = await admin
    .from('hevy_connections')
    .select('user_id')
  if (connectionsError) {
    console.error('[hevy-sync-cron] CONNECTIONS_LOOKUP_FAILED', connectionsError)
    res.status(500).json({ error: 'CONNECTIONS_LOOKUP_FAILED' })
    return
  }

  const summary: UserSyncSummary[] = []

  for (const connection of connections ?? []) {
    const studentId = connection.user_id
    summary.push(await syncAllPagesForStudent(admin, studentId))
  }

  console.log('[hevy-sync-cron] processed', summary.length, 'connections')
  res.status(200).json({ processed: summary.length, summary })
}

async function syncAllPagesForStudent(
  admin: SupabaseClient<Database>,
  studentId: string,
): Promise<UserSyncSummary> {
  try {
    const { data: apiKey, error: apiKeyError } = await admin.rpc('get_hevy_api_key', {
      target_user_id: studentId,
    })
    if (apiKeyError || !apiKey) {
      return { userId: studentId, imported: 0, skipped: 0, error: 'NOT_CONNECTED' }
    }

    let page: number | null = null
    let hasMore = true
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    while (hasMore) {
      const result = await syncHevyPage(admin, studentId, apiKey, page)
      if (!result.ok) {
        errors.push(result.error)
        break
      }
      imported += result.imported
      skipped += result.skipped
      errors.push(...result.errors)
      hasMore = result.hasMore
      page = result.nextPage
    }

    await admin.rpc('record_hevy_sync_result', {
      target_user_id: studentId,
      sync_status: errors.length > 0 && imported === 0 ? 'error' : 'ok',
      sync_error: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
    })

    return { userId: studentId, imported, skipped, error: errors[0] }
  } catch (error) {
    console.error('[hevy-sync-cron] unhandled error for user', studentId, error)
    return {
      userId: studentId,
      imported: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
