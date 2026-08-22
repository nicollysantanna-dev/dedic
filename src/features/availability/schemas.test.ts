import {
  availabilityExceptionSchema,
  availabilityRuleSchema,
} from '@/features/availability/schemas'

describe('availability schemas', () => {
  it('aceita um intervalo semanal válido', () => {
    expect(
      availabilityRuleSchema.safeParse({
        isoWeekday: 1,
        startTime: '08:00',
        endTime: '12:00',
      }).success,
    ).toBe(true)
  })

  it('rejeita um bloqueio com fim anterior ao início', () => {
    expect(
      availabilityExceptionSchema.safeParse({
        startsAt: '2026-08-25T18:00',
        endsAt: '2026-08-25T17:00',
        reason: '',
      }).success,
    ).toBe(false)
  })
})
