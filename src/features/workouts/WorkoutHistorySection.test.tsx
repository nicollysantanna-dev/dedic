import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { WorkoutHistorySection } from './WorkoutHistorySection'

function makeWorkout(id: string) {
  return {
    id,
    name: `Treino ${id}`,
    started_at: '2026-09-01T10:00:00Z',
    finished_at: '2026-09-01T11:00:00Z',
    duration_seconds: 3600,
    record_count: 0,
    trainer_id: null,
    routine_id: null,
    appointment_id: null,
    workout_exercises: [],
  }
}

const limitCalls: number[] = []

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            is: () => ({
              order: () => ({
                limit: (n: number) => {
                  limitCalls.push(n)
                  const total = 25
                  const count = Math.min(n, total)
                  return Promise.resolve({
                    data: Array.from({ length: count }, (_, i) => makeWorkout(`w${i}`)),
                    error: null,
                  })
                },
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkoutHistorySection studentId="student-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WorkoutHistorySection', () => {
  it('busca mais treinos no servidor a cada "Carregar mais sessões", em vez de só revelar o que já veio', async () => {
    limitCalls.length = 0
    renderSection()

    await waitFor(() => expect(screen.getAllByText(/Treino w/).length).toBe(10))
    expect(limitCalls).toEqual([10])

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais sessões' }))
    await waitFor(() => expect(screen.getAllByText(/Treino w/).length).toBe(20))
    expect(limitCalls).toEqual([10, 20])

    // Terceiro clique passa do total real (25): o servidor devolve tudo que
    // existe, o botão some porque não há mais nada a buscar.
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais sessões' }))
    await waitFor(() => expect(screen.getAllByText(/Treino w/).length).toBe(25))
    expect(limitCalls).toEqual([10, 20, 30])
    expect(
      screen.queryByRole('button', { name: 'Carregar mais sessões' }),
    ).not.toBeInTheDocument()
  })
})
