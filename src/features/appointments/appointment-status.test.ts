import { describe, expect, it } from 'vitest'

import { canCompleteAppointment, getAppointmentStatusLabel } from './appointment-status'

describe('appointment status', () => {
  const now = new Date('2026-08-23T15:00:00Z')

  it('permite concluir apenas aula agendada que já começou', () => {
    expect(canCompleteAppointment('scheduled', '2026-08-23T14:00:00Z', now)).toBe(true)
    expect(canCompleteAppointment('scheduled', '2026-08-23T16:00:00Z', now)).toBe(false)
    expect(canCompleteAppointment('completed', '2026-08-23T14:00:00Z', now)).toBe(false)
  })

  it('apresenta os resultados finais em português', () => {
    expect(getAppointmentStatusLabel('completed')).toBe('Realizada')
    expect(getAppointmentStatusLabel('student_no_show')).toBe('Falta do aluno')
  })
})
