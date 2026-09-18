import { describe, expect, it } from 'vitest'

import {
  attendanceGoalProgress,
  buildStudentAlerts,
  type ActivitySummary,
} from './student-alerts'

const now = new Date(2026, 8, 18, 12)
const base: ActivitySummary = {
  relationship_id: 'r',
  trainer_id: 't',
  student_id: 's',
  started_at: '2026-06-01T00:00:00Z',
  full_name: 'Ana',
  phone: null,
  balance: 5,
  next_renewal_on: '2026-12-01',
  completed_30d: 4,
  no_show_30d: 0,
  completed_total: 10,
  no_show_total: 1,
  attendance_rate: 91,
  weekly_average_4w: 1,
  last_completed_at: '2026-09-16T10:00:00Z',
  next_appointment_at: '2026-09-20T10:00:00Z',
  upcoming_count: 1,
  overdue_payments: 0,
  pending_payments: 1,
  next_due_on: '2026-09-25',
  last_progress_on: '2026-09-10',
  active_goals: 1,
  overdue_goals: 0,
  attendance_goal_per_week: 2,
}

describe('buildStudentAlerts', () => {
  it('aluno em dia não gera alertas', () => {
    expect(buildStudentAlerts(base, now)).toEqual([])
  })

  it('sinaliza pagamento atrasado e falta de créditos como alta prioridade', () => {
    const alerts = buildStudentAlerts({ ...base, overdue_payments: 1, balance: 0 }, now)
    expect(alerts.map((alert) => alert.kind)).toEqual(['overdue_payment', 'low_credits'])
    expect(alerts.every((alert) => alert.severity === 'high')).toBe(true)
  })

  it('sinaliza inatividade só quando não há aula futura', () => {
    const inactive = {
      ...base,
      last_completed_at: '2026-08-20T10:00:00Z',
      upcoming_count: 0,
    }
    expect(buildStudentAlerts(inactive, now).map((alert) => alert.label)).toContain(
      '29 dias sem aula',
    )
    expect(buildStudentAlerts({ ...inactive, upcoming_count: 1 }, now)).toEqual([])
  })

  it('sinaliza faltas, renovação, progresso parado e meta vencida', () => {
    const alerts = buildStudentAlerts(
      {
        ...base,
        no_show_30d: 2,
        next_renewal_on: '2026-09-22',
        last_progress_on: '2026-07-01',
        overdue_goals: 1,
      },
      now,
    )
    expect(alerts.map((alert) => alert.kind)).toEqual([
      'no_shows',
      'renewal_soon',
      'progress_stale',
      'goal_overdue',
    ])
  })

  it('aluno recém-vinculado sem registros não é marcado como parado antes de 30 dias', () => {
    const fresh = {
      ...base,
      started_at: '2026-09-10T00:00:00Z',
      last_completed_at: null,
      last_progress_on: null,
      upcoming_count: 0,
    }
    expect(buildStudentAlerts(fresh, now)).toEqual([])
  })
})

describe('attendanceGoalProgress', () => {
  it('compara a média semanal com a meta', () => {
    expect(attendanceGoalProgress(base)).toBe(50)
    expect(attendanceGoalProgress({ ...base, weekly_average_4w: 3 })).toBe(100)
    expect(attendanceGoalProgress({ ...base, attendance_goal_per_week: null })).toBeNull()
  })
})
