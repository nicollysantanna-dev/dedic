import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LegalFooterLinks, SignUpLegalNotice } from '@/features/legal/LegalLinks'

describe('links legais', () => {
  it('aviso do cadastro tem os dois links em nova aba', () => {
    render(
      <MemoryRouter>
        <SignUpLegalNotice />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(
        /inclusive com o tratamento dos dados de saúde que você registrar\./,
      ),
    ).toHaveTextContent(
      'Ao criar sua conta, você concorda com os Termos de uso e a Política de privacidade, inclusive com o tratamento dos dados de saúde que você registrar.',
    )
    const terms = screen.getByRole('link', { name: 'Termos de uso' })
    const privacy = screen.getByRole('link', { name: 'Política de privacidade' })
    expect(terms).toHaveAttribute('href', '/termos')
    expect(privacy).toHaveAttribute('href', '/privacidade')
    for (const link of [terms, privacy]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })

  it('rodapé tem os dois links na mesma aba', () => {
    render(
      <MemoryRouter>
        <LegalFooterLinks />
      </MemoryRouter>,
    )

    const terms = screen.getByRole('link', { name: 'Termos de uso' })
    const privacy = screen.getByRole('link', { name: 'Política de privacidade' })
    expect(terms).toHaveAttribute('href', '/termos')
    expect(privacy).toHaveAttribute('href', '/privacidade')
    expect(terms).not.toHaveAttribute('target')
    expect(privacy).not.toHaveAttribute('target')
  })
})
