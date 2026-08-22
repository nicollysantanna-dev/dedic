import { describe, expect, it } from 'vitest'

import { paymentSchema } from './schemas'

const base = {
  packageId: '11111111-1111-4111-8111-111111111111',
  amountReais: 500,
  dueOn: '2026-09-01',
  status: 'pending' as const,
  paidOn: '',
}

describe('paymentSchema', () => {
  it('aceita pagamento pendente sem data de baixa', () => {
    expect(paymentSchema.safeParse(base).success).toBe(true)
  })

  it('exige data quando o pagamento estiver pago', () => {
    const result = paymentSchema.safeParse({ ...base, status: 'paid' })
    expect(result.success).toBe(false)
  })
})
