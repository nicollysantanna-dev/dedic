import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import { HevyIntegrationCard } from './HevyIntegrationCard'

const maybeSingle = vi.fn()
const rpc = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    rpc,
  }),
}))

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { access_token: 'token-123' } }),
}))

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <HevyIntegrationCard userId="student-1" />
    </QueryClientProvider>,
  )
}

describe('HevyIntegrationCard', () => {
  afterEach(() => {
    rpc.mockClear()
    maybeSingle.mockReset()
    vi.unstubAllGlobals()
  })

  it('mostra o formulário de conexão quando não há conta vinculada', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    renderCard()

    expect(await screen.findByLabelText('Chave de API do Hevy Pro')).toBeInTheDocument()

    await userEvent.type(
      screen.getByLabelText('Chave de API do Hevy Pro'),
      'chave-secreta',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Conectar' }))

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('connect_hevy_account', {
        requested_api_key: 'chave-secreta',
      }),
    )
  })

  it('mostra status e ações quando já está conectado', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        connected_at: '2026-09-20T10:00:00Z',
        last_synced_at: null,
        last_sync_status: null,
        last_sync_error: null,
      },
      error: null,
    })
    renderCard()

    expect(await screen.findByText(/Conectado desde/)).toBeInTheDocument()
    expect(screen.getByText('Ainda não sincronizado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sincronizar agora/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Desconectar/ })).toBeInTheDocument()
  })

  it('sincroniza e mostra quantos treinos foram importados', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        connected_at: '2026-09-20T10:00:00Z',
        last_synced_at: null,
        last_sync_status: null,
        last_sync_error: null,
      },
      error: null,
    })
    const fetchMock: Mock<typeof fetch> = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ imported: 2, skipped: 0, errors: [], hasMore: false }),
    })
    vi.stubGlobal('fetch', fetchMock)
    renderCard()

    await userEvent.click(
      await screen.findByRole('button', { name: /Sincronizar agora/ }),
    )

    expect(await screen.findByText('2 treinos importados.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/hevy-sync',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
      }),
    )
  })

  it('mostra erro quando a sincronização falha', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        connected_at: '2026-09-20T10:00:00Z',
        last_synced_at: null,
        last_sync_status: null,
        last_sync_error: null,
      },
      error: null,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'INVALID_HEVY_KEY' }),
      }),
    )
    renderCard()

    await userEvent.click(
      await screen.findByRole('button', { name: /Sincronizar agora/ }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível sincronizar. Tente novamente.',
    )
  })

  it('pede confirmação antes de desconectar', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        connected_at: '2026-09-20T10:00:00Z',
        last_synced_at: '2026-09-21T10:00:00Z',
        last_sync_status: 'ok',
        last_sync_error: null,
      },
      error: null,
    })
    renderCard()

    await userEvent.click(await screen.findByRole('button', { name: /Desconectar/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('disconnect_hevy_account'))
  })
})
