import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { TermsPage } from '@/features/legal/TermsPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Tela de entrada</p>} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('páginas legais', () => {
  it('política mostra título, vigência e contato', () => {
    renderAt('/privacidade')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de privacidade do Dedic' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Vigente desde 2 de outubro de 2026.')).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', {
      name: 'nicollyengenheira@gmail.com',
    })) {
      expect(link).toHaveAttribute('href', 'mailto:nicollyengenheira@gmail.com')
    }
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(10)
  })

  it('política descreve a edição e exclusão de dados de saúde', () => {
    renderAt('/privacidade')

    expect(
      screen.getByText(
        /O registro desses dados é opcional, e você pode editá-los ou apagá-los a qualquer momento, ou excluir a conta\./,
      ),
    ).toBeInTheDocument()
  })

  it('política menciona o cache do aplicativo instalado (PWA)', () => {
    renderAt('/privacidade')

    expect(
      screen.getByText(
        /Como o Dedic pode ser instalado como aplicativo \(PWA\), o navegador também guarda em cache os arquivos do próprio aplicativo/,
      ),
    ).toBeInTheDocument()
  })

  it('termos mostram título, vigência e 13 seções', () => {
    renderAt('/termos')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Termos de uso do Dedic' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Vigente desde 2 de outubro de 2026.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(13)
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /O Dedic não presta serviço de saúde/,
      }),
    ).toBeInTheDocument()
  })

  it('voltar sem histórico leva à entrada', async () => {
    renderAt('/termos')

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByText('Tela de entrada')).toBeInTheDocument()
  })
})
