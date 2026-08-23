import { describe, expect, it } from 'vitest'

import { sortAppointmentsForAgenda } from '@/features/appointments/appointment-order'

describe('sortAppointmentsForAgenda', () => {
  const now = new Date('2026-08-23T12:00:00-03:00')

  it('mostra próximas aulas da mais próxima para a mais distante', () => {
    const result = sortAppointmentsForAgenda(
      [
        appointment('september-03', '2026-09-03T08:00:00-03:00'),
        appointment('september-01', '2026-09-01T08:00:00-03:00'),
      ],
      now,
    )

    expect(result.map(({ id }) => id)).toEqual(['september-01', 'september-03'])
  })

  it('mantém histórico após as próximas aulas, do mais recente para o mais antigo', () => {
    const result = sortAppointmentsForAgenda(
      [
        appointment('old', '2026-08-01T08:00:00-03:00', 'completed'),
        appointment('future', '2026-09-01T08:00:00-03:00'),
        appointment('recent', '2026-08-20T08:00:00-03:00', 'completed'),
      ],
      now,
    )

    expect(result.map(({ id }) => id)).toEqual(['future', 'recent', 'old'])
  })

  it('prioriza a aula ativa quando há registros de remarcação no mesmo horário', () => {
    const result = sortAppointmentsForAgenda(
      [
        appointment('cancelled', '2026-09-03T08:00:00-03:00', 'cancelled_for_reschedule'),
        appointment('scheduled', '2026-09-03T08:00:00-03:00'),
      ],
      now,
    )

    expect(result.map(({ id }) => id)).toEqual(['scheduled', 'cancelled'])
  })
})

function appointment(
  id: string,
  startsAt: string,
  status:
    | 'scheduled'
    | 'completed'
    | 'student_no_show'
    | 'cancelled_for_reschedule'
    | 'cancelled_by_student'
    | 'cancelled_by_trainer' = 'scheduled',
) {
  return { id, starts_at: startsAt, status }
}
