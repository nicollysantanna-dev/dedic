import { z } from 'zod'

export type InvitationContactType = 'email' | 'phone'

const emailSchema = z.email('Informe um e-mail válido.')

export function parseInvitationContact(type: InvitationContactType, value: string) {
  const contact = value.trim()
  if (type === 'email') {
    return {
      student_email: emailSchema.parse(contact.toLowerCase()),
      student_phone: null,
    }
  }

  return {
    student_email: null,
    student_phone: normalizeBrazilianPhone(contact),
  }
}

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  const nationalNumber = digits.startsWith('55') ? digits.slice(2) : digits
  if (!/^\d{10,11}$/.test(nationalNumber)) {
    throw new Error('INVALID_PHONE')
  }
  return `+55${nationalNumber}`
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
