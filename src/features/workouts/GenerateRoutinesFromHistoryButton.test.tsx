import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GenerateRoutinesFromHistoryButton } from './GenerateRoutinesFromHistoryButton'

const rpc = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({ rpc }),
}))

function renderButton() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <GenerateRoutinesFromHistoryButton />
    </QueryClientProvider>,
  )
}

describe('GenerateRoutinesFromHistoryButton', () => {
  afterEach(() => {
    rpc.mockReset()
  })

  it('mostra quantas fichas foram criadas e atualizadas', async () => {
    rpc.mockResolvedValue({
      data: [
        { routine_id: 'r1', source_name: 'Quarta', status: 'created' },
        { routine_id: 'r2', source_name: 'Sexta', status: 'created' },
        { routine_id: 'r3', source_name: 'Segunda', status: 'updated' },
      ],
      error: null,
    })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar fichas' }))

    expect(await screen.findByText('2 fichas criadas, 1 atualizada.')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('generate_routines_from_history')
  })

  it('avisa quando nenhum padrão é encontrado', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar fichas' }))

    expect(await screen.findByText(/Nenhum padrão encontrado ainda/)).toBeInTheDocument()
  })

  it('avisa sobre fichas arquivadas que não foram alteradas', async () => {
    rpc.mockResolvedValue({
      data: [
        { routine_id: 'r1', source_name: 'Quarta', status: 'updated' },
        { routine_id: 'r2', source_name: 'Sexta', status: 'skipped' },
      ],
      error: null,
    })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar fichas' }))

    expect(await screen.findByText(/1 atualizada\./)).toBeInTheDocument()
    expect(screen.getByText(/1 ficha arquivada não foi alterada\./)).toBeInTheDocument()
  })

  it('mostra erro quando a geração falha', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar fichas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível gerar fichas. Tente novamente.',
    )
  })
})
