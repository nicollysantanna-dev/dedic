import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/AuthProvider'

const { signOut, single } = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  single: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut,
    },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}))

describe('AuthProvider', () => {
  afterEach(() => {
    signOut.mockClear()
    single.mockReset()
    vi.unstubAllGlobals()
  })

  it('encerra a sessão de uma conta excluída e avisa na entrada', async () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace, search: '' })
    single.mockResolvedValue({
      data: null,
      error: { message: 'ACCOUNT_DELETED', code: '42501' },
    })

    render(<AuthProvider>conteúdo</AuthProvider>)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/?conta=excluida'))
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('não encerra a sessão por outros erros ao carregar o perfil', async () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace, search: '' })
    single.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })

    render(<AuthProvider>conteúdo</AuthProvider>)

    await waitFor(() => expect(single).toHaveBeenCalled())
    expect(signOut).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
