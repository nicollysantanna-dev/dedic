import { describe, expect, it } from 'vitest'

import { buildStudentHomeSummary } from './student-home-summary'

describe('buildStudentHomeSummary', () => {
  it('calcula uso, frequência e próxima aula ignorando cancelamentos', () => {
    const summary = buildStudentHomeSummary({
      appointments: [
        appointment('completed', '2026-09-10T08:00:00-03:00'),
        appointment('student_no_show', '2026-09-11T08:00:00-03:00'),
        appointment('cancelled_by_student', '2026-09-12T08:00:00-03:00'),
        appointment('scheduled', '2026-09-20T08:00:00-03:00'),
      ],
      activePackageId: 'package-1',
      balance: 4,
      now: new Date('2026-09-17T10:00:00-03:00'),
    })

    expect(summary).toEqual({
      balance: 4,
      packageUsed: 2,
      attendance: 50,
      nextAppointment: '2026-09-20T08:00:00-03:00',
    })
  })
})

function appointment(
  status: 'completed' | 'student_no_show' | 'cancelled_by_student' | 'scheduled',
  startsAt: string,
) {
  return {
    starts_at: startsAt,
    status,
    package_id: 'package-1',
  }
}
