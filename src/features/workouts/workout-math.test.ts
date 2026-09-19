import { describe, expect, it } from 'vitest'

import {
  estimateOneRepMax,
  formatClock,
  formatDuration,
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
})
