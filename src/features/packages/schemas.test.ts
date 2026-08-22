import { creditAdjustmentSchema, packageSchema } from '@/features/packages/schemas'

describe('package schemas', () => {
  it('rejeita pacote que vence antes do início', () => {
    expect(
      packageSchema.safeParse({
        relationshipId: '0c090c14-a6b3-4e4f-bb24-0fa73fa3a567',
        lessonCount: 8,
        priceReais: 500,
        startsOn: '2026-09-10',
        expiresOn: '2026-09-01',
      }).success,
    ).toBe(false)
  })

  it('exige justificativa em ajuste de crédito', () => {
    expect(creditAdjustmentSchema.safeParse({ amount: 1, reason: 'x' }).success).toBe(
      false,
    )
  })
})
