import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatDateOnly,
  formatPhone,
  initials,
  toIsoDate,
} from './format'

describe('format', () => {
  it('formata datas sem fuso sem deslocar o dia', () => {
    expect(formatDateOnly('2026-09-18')).toBe('18/09/2026')
  })

  it('usa a data local em toIsoDate', () => {
    expect(toIsoDate(new Date(2026, 8, 18, 23, 30))).toBe('2026-09-18')
  })

  it('formata moeda em reais', () => {
    expect(formatCurrency(123456).replace(/\u00a0/g, ' ')).toBe('R$ 1.234,56')
  })

  it('formata telefone E.164 brasileiro', () => {
    expect(formatPhone('+5511988887777')).toBe('(11) 98888-7777')
    expect(formatPhone(null)).toBeNull()
  })

  it('gera iniciais com até duas letras', () => {
    expect(initials('Ana Clara Souza')).toBe('AC')
  })
})
