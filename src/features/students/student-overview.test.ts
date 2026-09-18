import { describe, expect, it } from 'vitest'

import type { ActivitySummary } from './student-alerts'
import { buildStudentOverviews } from './student-overview'

const summary = (overrides: Partial<ActivitySummary>): ActivitySummary => ({
  relationship_id: 'r',
  trainer_id: 't',
  student_id: 's',
  started_at: '2026-06-01T00:00:00Z',
  full_name: 'Ana',
  phone: null,
  balance: 5,
  next_renewal_on: '2026-12-01',
  completed_30d: 2,
  no_show_30d: 0,
  completed_total: 8,
  no_show_total: 2,
  attendance_rate: 80,
  weekly_average_4w: 0.5,
  last_completed_at: '2026-09-16T10:00:00Z',
  next_appointment_at: '2026-09-20T10:00:00Z',
  upcoming_count: 1,
  overdue_payments: 0,
  pending_payments: 0,
  next_due_on: null,
  last_progress_on: '2026-09-15',
  active_goals: 0,
  overdue_goals: 0,
  attendance_goal_per_week: null,
  ...overrides,
})

describe('buildStudentOverviews', () => {
  const now = new Date(2026, 8, 18)

  it('ordena por nome e mapeia os campos da vista', () => {
    const [first, second] = buildStudentOverviews(
      [summary({ full_name: 'Bruno', student_id: 'b' }), summary({ full_name: 'Ana' })],
      now,
    )
    expect(first?.name).toBe('Ana')
    expect(second?.name).toBe('Bruno')
    expect(first).toMatchObject({
      balance: 5,
      attendance: 80,
      nextAppointment: '2026-09-20T10:00:00Z',
      renewalDate: '2026-12-01',
      paymentStatus: null,
      needsAttention: false,
    })
  })

  it('deriva situação financeira e atenção a partir dos alertas', () => {
    const [student] = buildStudentOverviews(
      [summary({ overdue_payments: 1, balance: 0 })],
      now,
    )
    expect(student?.paymentStatus).toBe('overdue')
    expect(student?.needsAttention).toBe(true)
    expect(student?.alerts.map((alert) => alert.kind)).toEqual([
      'overdue_payment',
      'low_credits',
    ])
  })
})
