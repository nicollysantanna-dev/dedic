import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ExerciseRecordsSection } from './ExerciseRecordsSection'

function makeRecord(i: number) {
  return {
    exercise_id: `e${i}`,
    student_id: 'student-1',
    best_weight_kg: String(100 - i),
    best_one_rm: '100',
    best_volume: '1000',
    sessions_count: 1,
    last_performed_at: '2026-09-01T10:00:00Z',
    exercise: null,
  }
}

const records = Array.from({ length: 14 }, (_, i) => makeRecord(i))

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: records, error: null }),
        }),
      }),
    }),
  }),
}))

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ExerciseRecordsSection studentId="student-1" trainerId={null} />
    </QueryClientProvider>,
  )
}

describe('ExerciseRecordsSection', () => {
  it('pagina os recordes em vez de renderizar tudo de uma vez', async () => {
    renderSection()

    await waitFor(() => expect(screen.getAllByText('Exercício').length).toBe(10))
    expect(
      screen.getByRole('button', { name: 'Carregar mais recordes' }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais recordes' }))

    await waitFor(() => expect(screen.getAllByText('Exercício').length).toBe(14))
    expect(
      screen.queryByRole('button', { name: 'Carregar mais recordes' }),
    ).not.toBeInTheDocument()
  })
})
