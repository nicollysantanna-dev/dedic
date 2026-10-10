import { toBlob } from 'html-to-image'

export type CardDelivery = 'shared' | 'downloaded' | 'cancelled'

/** Converte o card (renderizado fora da tela) em PNG 1080×1920. */
export async function renderCardBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, { pixelRatio: 1, cacheBust: true })
  if (!blob) throw new Error('CARD_RENDER_FAILED')
  return blob
}

/** Compartilha o PNG com `navigator.share`; sem suporte, baixa o arquivo. */
export async function deliverCard(blob: Blob, fileName: string): Promise<CardDelivery> {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Meu resumo do mês' })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

/** Rótulo do botão conforme o que o navegador consegue fazer. */
export function shareButtonLabel(): string {
  return typeof navigator.share === 'function' ? 'Compartilhar' : 'Baixar imagem'
}
