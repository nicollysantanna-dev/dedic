import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AvailabilityPanel } from './AvailabilityPanel'

const rules = [
  {
    id: 'rule-1',
    trainer_id: 'trainer-1',
    iso_weekday: 2,
    start_time: '08:00:00',
    end_time: '12:00:00',
    active: true,
  },
]

function table(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: (name: string) => table(name === 'availability_rules' ? rules : []),
  }),
}))

describe('AvailabilityPanel', () => {
  it('lista horários e bloqueios e valida o intervalo antes de enviar', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AvailabilityPanel trainerId="trainer-1" />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Terça-feira', { selector: 'p' })).toBeVisible()
    expect(await screen.findByText(/08:00.*12:00/)).toBeVisible()
    expect(await screen.findByText('Nenhum bloqueio futuro.')).toBeVisible()

    const weeklyForm = within(
      screen.getByRole('button', { name: 'Adicionar intervalo' }).closest('form')!,
    )
    await userEvent.clear(weeklyForm.getByLabelText('Fim'))
    await userEvent.type(weeklyForm.getByLabelText('Fim'), '07:00')
    await userEvent.click(weeklyForm.getByRole('button', { name: 'Adicionar intervalo' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'O horário final deve ser posterior ao inicial.',
      ),
    )
  })
})
