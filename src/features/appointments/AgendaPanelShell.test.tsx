import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AgendaPanelShell } from './AgendaPanelShell'

describe('AgendaPanelShell', () => {
  it('renderiza o painel no body e permite fechá-lo pelo fundo', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AgendaPanelShell open onClose={onClose}>
        <h2>Criar nova aula</h2>
      </AgendaPanelShell>,
    )

    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText('Criar nova aula')).toBeVisible()
    expect(container.querySelector('[role="dialog"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar painel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
