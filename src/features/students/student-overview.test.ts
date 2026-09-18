import { describe, expect, it } from 'vitest'

import { buildStudentOverviews } from './student-overview'

describe('buildStudentOverviews', () => {
  it('calcula saldo, frequência, próxima aula e atenção sem editar o extrato', () => {
    const result = buildStudentOverviews({
      relationships: [
        {
          id: 'relationship-1',
          student_id: 'student-1',
          profiles: { full_name: 'Ana Clara', phone: null },
        },
      ],
      appointments: [
        appointment('completed', '2026-09-10T08:00:00-03:00'),
        appointment('student_no_show', '2026-09-12T08:00:00-03:00'),
        appointment('scheduled', '2026-09-20T08:00:00-03:00'),
      ],
      packages: [
        {
          student_id: 'student-1',
          status: 'active',
          expires_on: '2026-10-01',
          lesson_count: 8,
        },
      ],
      payments: [
        {
          student_id: 'student-1',
          status: 'overdue',
          due_on: '2026-09-15',
        },
      ],
      credits: [
        { student_id: 'student-1', amount: 8 },
        { student_id: 'student-1', amount: -7 },
      ],
      now: new Date('2026-09-16T12:00:00-03:00'),
    })

    expect(result[0]).toMatchObject({
      name: 'Ana Clara',
      balance: 1,
      attendance: 50,
      nextAppointment: '2026-09-20T08:00:00-03:00',
      paymentStatus: 'overdue',
      needsAttention: true,
    })
  })
})

function appointment(
  status: 'completed' | 'student_no_show' | 'scheduled',
  startsAt: string,
) {
  return { student_id: 'student-1', status, starts_at: startsAt }
}
