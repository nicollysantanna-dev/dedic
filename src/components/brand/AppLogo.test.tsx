import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppLogo } from '@/components/brand/AppLogo'

describe('AppLogo', () => {
  it('mostra o ícone do Dedic com nome acessível quando é a única identificação', () => {
    render(<AppLogo label="Dedic" />)

    expect(screen.getByRole('img', { name: 'Dedic' })).toHaveAttribute(
      'src',
      '/pwa-192x192.png',
    )
  })

  it('é decorativo quando acompanha o nome escrito', () => {
    const { container } = render(<AppLogo />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
