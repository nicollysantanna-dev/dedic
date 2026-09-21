import { describe, expect, it } from 'vitest'

import {
  estimateOneRepMax,
  formatClock,
  formatDuration,
  recordKindsFor,
  totalVolume,
} from './workout-math'

describe('workout-math', () => {
  it('soma o volume ignorando séries sem carga ou repetições', () => {
    expect(
      totalVolume([
        { weightKg: 50, reps: 10 },
        { weightKg: null, reps: 12 },
        { weightKg: 20, reps: null },
      ]),
    ).toBe(500)
  })

  it('estima o 1RM por Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(80, 10)).toBe(106.7)
    expect(estimateOneRepMax(0, 5)).toBe(0)
  })

  it('formata durações e relógio', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(754)).toBe('12min 34s')
    expect(formatDuration(3720)).toBe('1h 02min')
    expect(formatClock(95)).toBe('1:35')
  })

  it('marca recordes de carga, 1RM e volume frente ao melhor conhecido', () => {
    const best = { weightKg: 50, oneRm: 63.3, volume: 480 }
    expect(recordKindsFor({ weightKg: 55, reps: 5 }, best)).toEqual(['weight', 'one_rm'])
    expect(recordKindsFor({ weightKg: 45, reps: 10 }, best)).toEqual([])
    expect(recordKindsFor({ weightKg: 40, reps: 12 }, null)).toEqual([
      'weight',
      'one_rm',
      'volume',
    ])
  })

  it('ignora aquecimento e séries sem carga', () => {
    expect(recordKindsFor({ weightKg: 100, reps: 1, setType: 'warmup' }, null)).toEqual(
      [],
    )
    expect(recordKindsFor({ weightKg: null, reps: 10 }, null)).toEqual([])
  })
})
