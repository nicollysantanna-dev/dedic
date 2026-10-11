import { afterEach, describe, expect, it, vi } from 'vitest'

import { deliverCard } from '@/features/gamification/share-image'

const blob = new Blob(['png'], { type: 'image/png' })

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(navigator, 'canShare')
})

describe('deliverCard', () => {
  it('compartilha o arquivo quando o navegador suporta', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    await expect(
      deliverCard(blob, 'dedic-resumo-2026-09.png', 'Meu resumo do mês'),
    ).resolves.toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('usa o título informado na folha de compartilhamento', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    await deliverCard(blob, 'dedic-treino-2026-10-10.png', 'Meu treino')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Meu treino' }))
  })

  it('baixa a imagem quando não há navigator.share', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    await expect(
      deliverCard(blob, 'dedic-resumo-2026-09.png', 'Meu resumo do mês'),
    ).resolves.toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:teste')
  })

  it('trata cancelamento do usuário como ação normal', async () => {
    const abort = new DOMException('cancelado', 'AbortError')
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abort),
      configurable: true,
    })

    await expect(
      deliverCard(blob, 'dedic-resumo-2026-09.png', 'Meu resumo do mês'),
    ).resolves.toBe('cancelled')
  })
})
