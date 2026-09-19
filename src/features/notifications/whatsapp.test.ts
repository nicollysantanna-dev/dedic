import { describe, expect, it } from 'vitest'

import { whatsappLink, whatsappTemplates } from './whatsapp'

describe('whatsappLink', () => {
  it('monta o link wa.me com a mensagem codificada', () => {
    expect(whatsappLink('+5511988887777', 'Oi, tudo bem?')).toBe(
      'https://wa.me/5511988887777?text=Oi%2C%20tudo%20bem%3F',
    )
  })

  it('não gera link sem telefone válido', () => {
    expect(whatsappLink(null, 'x')).toBeNull()
    expect(whatsappLink('123', 'x')).toBeNull()
  })
})

describe('whatsappTemplates', () => {
  it('usa o primeiro nome e o valor formatado', () => {
    const message = whatsappTemplates.paymentDue('Ana Aluna', 50000, '2026-09-25')
    expect(message).toContain('Oi, Ana!')
    expect(message).toContain('25/09/2026')
    expect(message.replace(/\s/g, ' ')).toContain('R$ 500,00')
  })

  it('adapta a mensagem de renovação ao saldo', () => {
    expect(whatsappTemplates.renewal('Ana', 0)).toContain('Seus créditos acabaram')
    expect(whatsappTemplates.renewal('Ana', 1)).toContain('1 crédito.')
  })
})
