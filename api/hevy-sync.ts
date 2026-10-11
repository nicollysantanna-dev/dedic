import type { VercelRequest, VercelResponse } from '@vercel/node'

import { SYNC_ERROR_MESSAGES, createAdminClient, syncHevyPage } from './hevy-sync-core.js'

/**
 * Sincroniza uma página do histórico de treinos do Hevy para o aluno
 * autenticado. Chamada sob demanda pelo botão "Sincronizar agora", que é a
 * única forma de sincronizar (a sincronização diária automática foi desativada
 * em 2026-10-11, ver ADR 0007 e item 0033). Paginável: o cliente chama de novo com o `nextPage` devolvido
 * enquanto `hasMore` vier true.
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

  const admin = createAdminClient()
  if (!admin) {
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' })
    return
  }

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

  const requestBody: unknown = req.body
  const requestedPage =
    typeof requestBody === 'object' && requestBody !== null && 'page' in requestBody
      ? Number(requestBody.page)
      : null

  const result = await syncHevyPage(
    admin,
    studentId,
    apiKey,
    requestedPage !== null && Number.isFinite(requestedPage) ? requestedPage : null,
  )

  if (!result.ok) {
    await admin.rpc('record_hevy_sync_result', {
      target_user_id: studentId,
      sync_status: 'error',
      sync_error: SYNC_ERROR_MESSAGES[result.error],
    })
    res
      .status(502)
      .json({ error: result.error, status: result.status, body: result.body })
    return
  }

  await admin.rpc('record_hevy_sync_result', {
    target_user_id: studentId,
    sync_status: result.errors.length > 0 && result.imported === 0 ? 'error' : 'ok',
    sync_error:
      result.errors.length > 0 ? result.errors.slice(0, 3).join('; ') : undefined,
  })

  res.status(200).json({
    imported: result.imported,
    skipped: result.skipped,
    errors: result.errors,
    hasMore: result.hasMore,
    nextPage: result.nextPage,
  })
}
