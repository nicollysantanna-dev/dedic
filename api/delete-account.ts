import { randomBytes } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import type { Database } from '../src/lib/supabase/database.types.js'

import { createAdminClient } from './hevy-sync-core.js'

/**
 * Exclui a conta do aluno autenticado por anonimização (LGPD): a RPC
 * `delete_account` anonimiza o banco, depois removemos as fotos do Storage e
 * neutralizamos o login no Auth (e-mail placeholder, senha aleatória, banido).
 * Idempotente: pode ser repetida se uma etapa posterior falhar.
 *
 * Logs registram apenas o código de erro — nunca uid, e-mail, token ou corpo.
 */

const CLEANED_BUCKETS = ['progress-photos', 'avatar-photos'] as const

export type DeleteAccountResult =
  { ok: true } | { ok: false; status: number; error: string }

function fail(error: string, status = 500): DeleteAccountResult {
  console.error(`[delete-account] ${error}`)
  return { ok: false, status, error }
}

export async function deleteAccount(
  admin: SupabaseClient<Database>,
  accessToken: string,
): Promise<DeleteAccountResult> {
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
  if (userError || !userData.user) return fail('INVALID_TOKEN', 401)
  const uid = userData.user.id

  const { error: rpcError } = await admin.rpc('delete_account', { target_user_id: uid })
  if (rpcError) return fail('DELETE_FAILED')

  for (const bucket of CLEANED_BUCKETS) {
    const files = admin.storage.from(bucket)
    const { data: entries, error: listError } = await files.list(uid, { limit: 1000 })
    if (listError || !entries) return fail('STORAGE_CLEANUP_FAILED')
    if (entries.length === 0) continue
    const { error: removeError } = await files.remove(
      entries.map((entry) => `${uid}/${entry.name}`),
    )
    if (removeError) return fail('STORAGE_CLEANUP_FAILED')
  }

  // O GoTrue mescla `user_metadata` (`{}` não apaga nada); chave `null` remove.
  const clearedMetadata = Object.fromEntries(
    Object.keys(userData.user.user_metadata ?? {}).map((key) => [key, null]),
  )
  const { error: authError } = await admin.auth.admin.updateUserById(uid, {
    email: `removido-${uid}@dedic.invalid`,
    user_metadata: clearedMetadata,
    ban_duration: '876000h',
    password: randomBytes(32).toString('base64url'),
  })
  if (authError) return fail('AUTH_CLEANUP_FAILED')

  // A sessão expira sozinha e o login já está banido; falha aqui não reprova.
  const { error: signOutError } = await admin.auth.admin.signOut(accessToken, 'global')
  if (signOutError) console.error('[delete-account] SIGN_OUT_FAILED')

  return { ok: true }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await handleDelete(req, res)
  } catch {
    console.error('[delete-account] UNEXPECTED_ERROR')
    if (!res.headersSent) {
      res.status(500).json({ error: 'UNEXPECTED_ERROR' })
    }
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
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
    console.error('[delete-account] SERVER_MISCONFIGURED')
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' })
    return
  }

  const result = await deleteAccount(admin, accessToken)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(200).json({ status: 'deleted' })
}
