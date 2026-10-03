import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { StudentHomePage } from '@/features/dashboard/StudentHomePage'

type Filters = Record<string, unknown>

/** Pacote ativo do personal anterior (vínculo encerrado) e nenhum do personal atual. */
function resolve(table: string, filters: Filters) {
  switch (table) {
    case 'trainer_student_relationships':
      return {
        trainer_id: 'personal-atual',
        profiles: { full_name: 'Marlon', phone: null },
      }
    case 'lesson_packages':
      return filters.trainer_id === 'personal-atual'
        ? null
        : {
            id: 'pacote-antigo',
            lesson_count: 8,
            expires_on: '2026-10-18',
            status: 'active',
          }
    case 'payments':
      return filters.trainer_id === 'personal-atual'
        ? null
        : { amount_cents: 50000, due_on: '2026-10-10', status: 'pending' }
    default:
      return []
  }
}

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    rpc: () => Promise.resolve({ data: 0, error: null }),
    from: (table: string) => {
      const filters: Filters = {}
      const result = () => Promise.resolve({ data: resolve(table, filters), error: null })
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters[column] = value
          return builder
        },
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: result,
        then: (onFulfilled: (value: unknown) => unknown) => result().then(onFulfilled),
      }
      return builder
    },
  }),
}))

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    profile: { id: 'aluna-1', full_name: 'Nicolly Cristine', role: 'student' },
    invitationClaimStatus: 'idle',
  }),
}))

vi.mock('@/features/install/InstallAppCard', () => ({ InstallAppCard: () => null }))

function renderHome() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <StudentHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function card(label: string) {
  const title = screen.getByText(label)
  return title.closest('article, div') as HTMLElement
}

describe('StudentHomePage', () => {
  it('ignora pacote e cobrança de um personal com vínculo encerrado', async () => {
    renderHome()

    await screen.findByText('Aulas utilizadas')
    expect(within(card('Aulas utilizadas')).getByText('0 / 0')).toBeInTheDocument()
    expect(within(card('Pagamento')).getByText('Sem pacote ativo')).toBeInTheDocument()
    expect(screen.queryByText(/18\/10\/2026/)).not.toBeInTheDocument()
  })
})
