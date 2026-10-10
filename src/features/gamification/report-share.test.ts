import { describe, expect, it } from 'vitest'

import {
  rarestMedals,
  shareFileName,
  shareSubtitle,
  shareTitle,
} from '@/features/gamification/report-share'
import type { MonthlyReport } from '@/features/gamification/schemas'

const report = (overrides: Partial<MonthlyReport> = {}): MonthlyReport => ({
  month: '2026-09',
  in_progress: false,
  check_ins: 12,
  days: [],
  weeks: [
    { week_start: '2026-08-31', check_ins: 3, target: 3, met: true, closed: true },
    { week_start: '2026-09-07', check_ins: 3, target: 3, met: true, closed: true },
    { week_start: '2026-09-14', check_ins: 2, target: 3, met: false, closed: true },
    { week_start: '2026-09-21', check_ins: 4, target: 3, met: true, closed: true },
  ],
  streak: { current: 0, best: 2 },
  achievements: [],
  next_achievement: null,
  lessons_completed: 0,
  ...overrides,
})

describe('shareTitle', () => {
  it('usa MÊS COMPLETO quando o mês ganhou a medalha de mês completo', () => {
    const full = report({
      achievements: [
        {
          code: 'full_month',
          period_start: '2026-09-01',
          earned_at: '2026-10-05T12:00:00Z',
        },
      ],
    })
    expect(shareTitle(full)).toBe('MÊS COMPLETO!')
  })

  it('usa RESUMO DO MÊS nos demais casos', () => {
    expect(shareTitle(report())).toBe('RESUMO DO MÊS')
  })
})

describe('shareSubtitle', () => {
  it('conta semanas batidas do mês e mostra a meta', () => {
    expect(shareSubtitle(report())).toBe('3 de 4 semanas batidas · meta 3x por semana')
  })

  it('usa singular para meta de uma vez por semana', () => {
    const oneADay = report({
      weeks: [
        { week_start: '2026-09-07', check_ins: 1, target: 1, met: true, closed: true },
      ],
    })
    expect(shareSubtitle(oneADay)).toBe('1 de 1 semanas batidas · meta 1x por semana')
  })
})

describe('rarestMedals', () => {
  it('mostra as medalhas do mês das mais raras para as mais comuns, no máximo três', () => {
    const achievements = [
      { code: 'first_check_in', period_start: null, earned_at: '2026-09-02T12:00:00Z' },
      {
        code: 'full_month',
        period_start: '2026-09-01',
        earned_at: '2026-10-05T12:00:00Z',
      },
      { code: 'streak_4', period_start: null, earned_at: '2026-09-28T12:00:00Z' },
      {
        code: 'early_bird',
        period_start: '2026-09-01',
        earned_at: '2026-10-05T12:00:00Z',
      },
    ]
    expect(rarestMedals(achievements, '2026-09').map((item) => item.code)).toEqual([
      'full_month',
      'early_bird',
      'streak_4',
    ])
  })

  it('ignora medalhas de outros meses', () => {
    const achievements = [
      {
        code: 'full_month',
        period_start: '2026-08-01',
        earned_at: '2026-09-05T12:00:00Z',
      },
    ]
    expect(rarestMedals(achievements, '2026-09')).toEqual([])
  })
})

describe('shareFileName', () => {
  it('nomeia o arquivo pelo mês', () => {
    expect(shareFileName('2026-09')).toBe('dedic-resumo-2026-09.png')
  })
})
