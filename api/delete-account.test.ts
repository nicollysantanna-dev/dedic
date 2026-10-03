// @vitest-environment node
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Database } from '../src/lib/supabase/database.types.js'

import handler, { deleteAccount } from './delete-account.js'

const UID = '11111111-2222-3333-4444-555555555555'
const TOKEN = 'token-secreto-abc'

type Overrides = {
  getUser?: unknown
  rpc?: unknown
  list?: (bucket: string) => unknown
  update?: unknown
  signOut?: unknown
}

function makeAdmin(o: Overrides = {}) {
  const remove = vi.fn<
    (paths: string[], bucket: string) => { data: never[]; error: null }
  >(() => ({ data: [], error: null }))
  const from = vi.fn((bucket: string) => ({
    list: () => Promise.resolve(o.list ? o.list(bucket) : { data: [], error: null }),
    remove: (paths: string[]) => Promise.resolve(remove(paths, bucket)),
  }))
  const getUser = vi.fn(() =>
    Promise.resolve(o.getUser ?? { data: { user: { id: UID } }, error: null }),
  )
  const rpc = vi.fn(() => Promise.resolve(o.rpc ?? { data: null, error: null }))
  const updateUserById = vi.fn(() =>
    Promise.resolve(o.update ?? { data: {}, error: null }),
  )
  const signOut = vi.fn(() => Promise.resolve(o.signOut ?? { error: null }))
  const admin = {
    auth: { getUser, admin: { updateUserById, signOut } },
    rpc,
    storage: { from },
  } as unknown as SupabaseClient<Database>
  return { admin, getUser, rpc, from, remove, updateUserById, signOut }
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(data: unknown) {
      res.body = data
      return res
    },
  }
  return res
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handler', () => {
  it('rejeita método diferente de POST', async () => {
    const res = makeRes()
    await handler(
      { method: 'GET', headers: {} } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it('exige token', async () => {
    const res = makeRes()
    await handler(
      { method: 'POST', headers: {} } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'AUTH_REQUIRED' })
  })
})

describe('deleteAccount', () => {
  it('token inválido', async () => {
    const f = makeAdmin({ getUser: { data: { user: null }, error: { message: 'x' } } })
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: false, status: 401, error: 'INVALID_TOKEN' })
    expect(f.rpc).not.toHaveBeenCalled()
  })

  it('sucesso', async () => {
    const f = makeAdmin({
      list: (bucket) => ({
        data: [{ name: `${bucket}-a.jpg` }, { name: `${bucket}-b.jpg` }],
        error: null,
      }),
    })
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: true })
    expect(f.rpc).toHaveBeenCalledWith('delete_account', { target_user_id: UID })
    expect(f.from).toHaveBeenCalledWith('progress-photos')
    expect(f.from).toHaveBeenCalledWith('avatar-photos')
    expect(f.from).not.toHaveBeenCalledWith('exercise-photos')
    expect(f.remove).toHaveBeenCalledWith(
      [`${UID}/progress-photos-a.jpg`, `${UID}/progress-photos-b.jpg`],
      'progress-photos',
    )
    expect(f.remove).toHaveBeenCalledWith(
      [`${UID}/avatar-photos-a.jpg`, `${UID}/avatar-photos-b.jpg`],
      'avatar-photos',
    )
    expect(f.updateUserById).toHaveBeenCalledTimes(1)
    const [id, attrs] = f.updateUserById.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(id).toBe(UID)
    expect(attrs).toMatchObject({
      email: `removido-${UID}@dedic.invalid`,
      user_metadata: {},
      ban_duration: '876000h',
    })
    expect(typeof attrs.password).toBe('string')
    expect((attrs.password as string).length).toBeGreaterThanOrEqual(32)
    expect(f.signOut).toHaveBeenCalledWith(TOKEN, 'global')
  })

  it('limpa as chaves existentes de user_metadata (GoTrue mescla)', async () => {
    const f = makeAdmin({
      getUser: {
        data: { user: { id: UID, user_metadata: { full_name: 'Ana', phone: '1' } } },
        error: null,
      },
    })
    await deleteAccount(f.admin, TOKEN)
    const [, attrs] = f.updateUserById.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(attrs.user_metadata).toEqual({ full_name: null, phone: null })
  })

  it('pasta vazia', async () => {
    const f = makeAdmin()
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: true })
    expect(f.remove).not.toHaveBeenCalled()
  })

  it('falha da RPC', async () => {
    const f = makeAdmin({ rpc: { data: null, error: { message: 'boom' } } })
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: false, status: 500, error: 'DELETE_FAILED' })
    expect(f.from).not.toHaveBeenCalled()
    expect(f.updateUserById).not.toHaveBeenCalled()
  })

  it('falha no Storage', async () => {
    const f = makeAdmin({
      list: () => ({ data: null, error: { message: 'boom' } }),
    })
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: false, status: 500, error: 'STORAGE_CLEANUP_FAILED' })
    expect(f.updateUserById).not.toHaveBeenCalled()
  })

  it('falha no Auth', async () => {
    const f = makeAdmin({ update: { data: null, error: { message: 'boom' } } })
    const result = await deleteAccount(f.admin, TOKEN)
    expect(result).toEqual({ ok: false, status: 500, error: 'AUTH_CLEANUP_FAILED' })
  })

  it('signOut com falha não reprova', async () => {
    const f = makeAdmin({ signOut: { error: { message: 'boom' } } })
    expect(await deleteAccount(f.admin, TOKEN)).toEqual({ ok: true })
  })

  it('logs sem dado pessoal', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const cases = [
      makeAdmin({ getUser: { data: { user: null }, error: { message: TOKEN } } }),
      makeAdmin({ rpc: { data: null, error: { message: UID } } }),
      makeAdmin({ list: () => ({ data: null, error: { message: UID } }) }),
      makeAdmin({ update: { data: null, error: { message: UID } } }),
      makeAdmin({ signOut: { error: { message: UID } } }),
    ]
    for (const f of cases) await deleteAccount(f.admin, TOKEN)
    expect(spy).toHaveBeenCalled()
    const logged = JSON.stringify([...spy.mock.calls, ...logSpy.mock.calls])
    expect(logged).not.toContain(UID)
    expect(logged).not.toContain(TOKEN)
    expect(logged).toContain('[delete-account]')
  })
})
