import { describe, expect, it } from 'vitest'

import {
  formatPhoneInput,
  normalizeBrazilianPhone,
  parseInvitationContact,
} from './invitation-contact'

describe('invitation contact', () => {
  it('normaliza e-mail antes de criar o convite', () => {
    expect(parseInvitationContact('email', ' ALUNO@EXAMPLE.COM ')).toEqual({
      student_email: 'aluno@example.com',
      student_phone: null,
    })
  })

  it('normaliza celular brasileiro para E.164', () => {
    expect(normalizeBrazilianPhone('(11) 99999-9999')).toBe('+5511999999999')
  })

  it('formata o celular durante a digitação', () => {
    expect(formatPhoneInput('11999999999')).toBe('(11) 99999-9999')
  })

  it('rejeita celular sem DDD', () => {
    expect(() => normalizeBrazilianPhone('99999-9999')).toThrow('INVALID_PHONE')
  })
})
