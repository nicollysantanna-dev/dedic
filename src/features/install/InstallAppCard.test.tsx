import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InstallAppCard } from '@/features/install/InstallAppCard'

const androidChrome =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
const iphoneSafari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const desktopChrome =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

function useBrowser({
  userAgent,
  standalone = false,
}: {
  userAgent: string
  standalone?: boolean
}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  // jsdom não define maxTouchPoints.
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: userAgent === desktopChrome ? 0 : 5,
  })
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: standalone && query === '(display-mode: standalone)',
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  )
}

/** Simula o evento que o Chrome dispara quando o app pode ser instalado. */
function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return prompt
}

describe('InstallAppCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('no iPhone ensina o caminho pelo botão Compartilhar', () => {
    useBrowser({ userAgent: iphoneSafari })
    render(<InstallAppCard />)

    expect(
      screen.getByRole('heading', { name: 'Instale o Dedic no seu celular' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/toque em Compartilhar e depois em Adicionar à Tela de Início/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Instalar o Dedic' }),
    ).not.toBeInTheDocument()
  })

  it('no Android sem convite do navegador mostra o menu do Chrome', () => {
    useBrowser({ userAgent: androidChrome })
    render(<InstallAppCard />)

    expect(screen.getByText(/toque em ⋮ e depois em Instalar app/)).toBeInTheDocument()
  })

  it('quando o navegador permite, instala pelo botão', async () => {
    useBrowser({ userAgent: androidChrome })
    render(<InstallAppCard />)
    const prompt = fireInstallPrompt('accepted')

    await userEvent.click(screen.getByRole('button', { name: 'Instalar o Dedic' }))

    expect(prompt).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Instale o Dedic/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('não aparece com o app já instalado', () => {
    useBrowser({ userAgent: iphoneSafari, standalone: true })
    render(<InstallAppCard />)

    expect(
      screen.queryByRole('heading', { name: /Instale o Dedic/ }),
    ).not.toBeInTheDocument()
  })

  it('não aparece no computador sem convite do navegador', () => {
    useBrowser({ userAgent: desktopChrome })
    render(<InstallAppCard />)

    expect(
      screen.queryByRole('heading', { name: /Instale o Dedic/ }),
    ).not.toBeInTheDocument()
  })

  it('"Agora não" esconde o card e lembra a escolha', async () => {
    useBrowser({ userAgent: iphoneSafari })
    const { unmount } = render(<InstallAppCard />)

    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(
      screen.queryByRole('heading', { name: /Instale o Dedic/ }),
    ).not.toBeInTheDocument()

    unmount()
    render(<InstallAppCard />)
    expect(
      screen.queryByRole('heading', { name: /Instale o Dedic/ }),
    ).not.toBeInTheDocument()
  })
})
