import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CreditManagerDialog } from './StudentProfilePage'

describe('CreditManagerDialog', () => {
  it('prioriza novo pacote e separa o ajuste manual', () => {
    const onClose = vi.fn()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <CreditManagerDialog
          balance={2}
          name="Ana Clara"
          relationshipId="0c090c14-a6b3-4e4f-bb24-0fa73fa3a567"
          studentId="1c090c14-a6b3-4e4f-bb24-0fa73fa3a567"
          trainerId="2c090c14-a6b3-4e4f-bb24-0fa73fa3a567"
          onClose={onClose}
          onSaved={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('dialog', { name: 'Adicionar aulas' })).toBeVisible()
    expect(screen.getByText('Ana Clara possui 2 créditos disponíveis.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Novo pacote' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajuste' }))

    expect(screen.getByLabelText('Justificativa')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Registrar ajuste' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
