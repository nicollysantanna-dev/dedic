import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/components/layout/AppShell'

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    profile: {
      id: 'trainer-1',
      full_name: 'Nicolly Ferreira',
      phone: null,
      role: 'trainer',
      default_lesson_duration_minutes: 60,
    },
    signOut: vi.fn(),
  }),
}))

describe('AppShell', () => {
  it('expõe a navegação principal e renderiza a rota filha', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/app" element={<p>Dashboard carregado</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Dashboard carregado')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /início/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /agenda/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /alunos/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /financeiro/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /conta/i })).toHaveLength(2)
  })
})
