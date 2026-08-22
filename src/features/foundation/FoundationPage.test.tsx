import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { FoundationPage } from '@/features/foundation/FoundationPage'

describe('FoundationPage', () => {
  it('apresenta as informações essenciais do painel mobile', () => {
    render(
      <MemoryRouter>
        <FoundationPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /bom dia/i })).toBeInTheDocument()
    expect(screen.getByText('Próxima aula')).toBeInTheDocument()
    expect(screen.getByText('7', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /começar agora/i })).toBeVisible()
  })
})
