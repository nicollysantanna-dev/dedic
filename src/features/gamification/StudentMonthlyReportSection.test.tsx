import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StudentMonthlyReportSection } from '@/features/gamification/StudentMonthlyReportSection'

vi.mock('@/features/gamification/queries', () => ({
  useFirstCheckInDay: () => ({ data: '2026-09-02' }),
  useMonthlyReport: () => ({
    isPending: false,
    isError: false,
    data: {
      month: '2026-09',
      in_progress: false,
      check_ins: 5,
      days: [],
      weeks: [],
      streak: { current: 0, best: 1 },
      achievements: [],
      next_achievement: null,
      lessons_completed: 0,
    },
  }),
}))

describe('StudentMonthlyReportSection', () => {
  it('mostra o relatório do aluno em modo leitura, sem compartilhar', () => {
    render(<StudentMonthlyReportSection studentId="aluna-1" />)

    expect(screen.getByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
    expect(screen.getByText('5 check-ins no mês')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /compartilhar|baixar/i }),
    ).not.toBeInTheDocument()
  })

  it('oferece os meses desde o primeiro check-in', () => {
    render(<StudentMonthlyReportSection studentId="aluna-1" />)

    expect(screen.getByRole('option', { name: 'setembro de 2026' })).toBeInTheDocument()
  })
})
