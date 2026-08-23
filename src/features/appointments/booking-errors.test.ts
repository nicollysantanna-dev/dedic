import { getBookingError } from '@/features/appointments/booking-errors'

describe('booking errors', () => {
  it('explica conflito concorrente sem expor erro interno', () => {
    expect(getBookingError(new Error('SLOT_CONFLICT'))).toBe(
      'Este horário acabou de ficar indisponível. Escolha outro.',
    )
  })

  it('explica ausência de crédito', () => {
    expect(getBookingError(new Error('INSUFFICIENT_CREDITS'))).toBe(
      'Seu pacote não possui créditos disponíveis.',
    )
  })

  it('explica pacote inválido na remarcação', () => {
    expect(getBookingError(new Error('PACKAGE_INVALID_FOR_NEW_DATE'))).toBe(
      'O pacote não é válido para a nova data escolhida.',
    )
  })

  it('explica conflito com bloqueio do personal', () => {
    expect(getBookingError(new Error('BLOCKED_PERIOD_CONFLICT'))).toBe(
      'Este período está bloqueado na sua agenda.',
    )
  })
})
