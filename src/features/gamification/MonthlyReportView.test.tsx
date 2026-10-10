import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonthlyReportView } from '@/features/gamification/MonthlyReportView'
import type { MonthlyReport } from '@/features/gamification/schemas'

const emptyReport: MonthlyReport = {
  month: '2026-09',
  in_progress: false,
  check_ins: 0,
  days: [],
  weeks: [],
  streak: { current: 0, best: 0 },
  achievements: [],
  next_achievement: null,
  lessons_completed: 0,
}

const inProgressReport: MonthlyReport = {
  month: '2026-10',
  in_progress: true,
  check_ins: 4,
  days: [
    { day: '2026-10-01', had_workout: true, had_lesson: false },
    { day: '2026-10-02', had_workout: true, had_lesson: true },
    { day: '2026-10-06', had_workout: true, had_lesson: false },
    { day: '2026-10-07', had_workout: false, had_lesson: true },
  ],
  weeks: [
    { week_start: '2026-09-28', check_ins: 3, target: 3, met: true, closed: true },
    { week_start: '2026-10-05', check_ins: 1, target: 3, met: false, closed: false },
  ],
  streak: { current: 1, best: 2 },
  achievements: [
    { code: 'first_check_in', period_start: null, earned_at: '2026-09-02T12:00:00Z' },
  ],
  next_achievement: { code: 'streak_4', current: 1, target: 4 },
  lessons_completed: 1,
}

describe('MonthlyReportView', () => {
  it('explica como começar quando o mês não tem check-ins', () => {
    render(<MonthlyReportView report={emptyReport} today="2026-10-07" />)

    expect(
      screen.getByText(
        'Seu primeiro check-in acontece quando você finaliza um treino ou conclui uma aula.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra "Até agora" e quantos check-ins faltam na semana atual', () => {
    render(<MonthlyReportView report={inProgressReport} today="2026-10-07" />)

    expect(screen.getByText('Até agora')).toBeInTheDocument()
    expect(
      screen.getByText('Faltam 2 check-ins para bater a meta desta semana.'),
    ).toBeInTheDocument()
  })

  it('mostra o mês por extenso quando o mês já fechou', () => {
    render(
      <MonthlyReportView
        report={{ ...inProgressReport, in_progress: false, month: '2026-09' }}
        today="2026-10-07"
      />,
    )

    expect(screen.getByText('setembro de 2026')).toBeInTheDocument()
    expect(screen.queryByText('Até agora')).not.toBeInTheDocument()
  })

  it('mostra o progresso da próxima medalha', () => {
    render(<MonthlyReportView report={inProgressReport} today="2026-10-07" />)

    expect(screen.getByRole('progressbar', { name: 'Sequência 4' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    )
  })

  it('lista as medalhas conquistadas', () => {
    render(<MonthlyReportView report={inProgressReport} today="2026-10-07" />)

    expect(screen.getByText('Primeiro passo')).toBeInTheDocument()
  })
})
