import { describe, expect, it } from 'vitest'

import {
  buildWeightSeries,
  daysUntil,
  goalProgress,
  latestMeasurements,
} from './progress-summary'

const entry = (
  id: string,
  recorded_on: string,
  weight_kg: number | null,
  measurements: Record<string, number> = {},
  created_at = `${recorded_on}T10:00:00Z`,
) => ({ id, recorded_on, weight_kg, measurements, created_at })

describe('buildWeightSeries', () => {
  it('ordena por data e usa o último peso do dia', () => {
    const series = buildWeightSeries([
      entry('b', '2026-09-10', 70, {}, '2026-09-10T12:00:00Z'),
      entry('a', '2026-09-10', 71, {}, '2026-09-10T08:00:00Z'),
      entry('c', '2026-09-01', 72),
      entry('d', '2026-09-12', null, { waist_cm: 80 }),
    ])
    expect(series).toEqual([
      { date: '2026-09-01', weightKg: 72 },
      { date: '2026-09-10', weightKg: 70 },
    ])
  })
})

describe('latestMeasurements', () => {
  it('pega a medida mais recente de cada campo, mesmo de registros diferentes', () => {
    const latest = latestMeasurements([
      entry('a', '2026-09-01', null, { waist_cm: 82, hips_cm: 100 }),
      entry('b', '2026-09-10', null, { waist_cm: 80 }),
    ])
    expect(latest.waist_cm).toEqual({ value: 80, date: '2026-09-10' })
    expect(latest.hips_cm).toEqual({ value: 100, date: '2026-09-01' })
    expect(latest.chest_cm).toBeUndefined()
  })
})

describe('goalProgress', () => {
  const goal = {
    id: 'g',
    kind: 'weight' as const,
    initial_value: 70,
    target_value: 64,
    target_date: '2026-12-01',
    status: 'active' as const,
  }

  it('calcula a porcentagem para metas de redução', () => {
    expect(goalProgress(goal, 67)).toBe(50)
    expect(goalProgress(goal, 64)).toBe(100)
    expect(goalProgress(goal, 72)).toBe(0)
  })

  it('sem valor atual não há progresso', () => {
    expect(goalProgress(goal, null)).toBe(0)
  })
})

describe('daysUntil', () => {
  it('conta dias até a data-alvo', () => {
    expect(daysUntil('2026-09-28', new Date(2026, 8, 18, 15))).toBe(10)
    expect(daysUntil('2026-09-10', new Date(2026, 8, 18))).toBe(-8)
  })
})
