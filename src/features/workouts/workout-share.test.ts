import { describe, expect, it } from 'vitest'

import {
  hasWorkoutAchievement,
  workoutAchievementsLine,
  workoutShareTitle,
} from '@/features/workouts/workout-share'
import type { WorkoutSummary } from '@/features/workouts/workout-summary'

const summary = (overrides: Partial<WorkoutSummary> = {}): WorkoutSummary => ({
  name: 'Sexta - Pernas',
  finished_at: '2026-10-09T12:00:00Z',
  duration_seconds: 3600,
  sets: 12,
  volume_kg: 4200,
  week: { check_ins: 3, target: 5, met_now: false },
  new_achievements: [],
  records: 0,
  recorded_by_student: true,
  ...overrides,
})

const allThree = summary({
  new_achievements: ['streak_4'],
  week: { check_ins: 5, target: 5, met_now: true },
  records: 2,
})

describe('workoutShareTitle', () => {
  it('prioriza medalha nova', () => {
    expect(workoutShareTitle(allThree)).toBe('MEDALHA NOVA!')
  })

  it('usa semana batida quando não há medalha', () => {
    expect(
      workoutShareTitle(summary({ week: { check_ins: 5, target: 5, met_now: true } })),
    ).toBe('SEMANA BATIDA!')
  })

  it('usa recorde quando é a única conquista', () => {
    expect(workoutShareTitle(summary({ records: 1 }))).toBe('RECORDE!')
  })

  it('usa treino feito sem conquista', () => {
    expect(workoutShareTitle(summary())).toBe('TREINO FEITO')
  })
})

describe('workoutAchievementsLine', () => {
  it('junta medalha, semana e recordes', () => {
    expect(workoutAchievementsLine(allThree)).toBe(
      'Sequência 4 · Semana 5 de 5 · 2 recordes',
    )
  })

  it('usa singular para um recorde', () => {
    expect(workoutAchievementsLine(summary({ records: 1 }))).toBe('1 recorde')
  })

  it('fica vazia sem conquistas', () => {
    expect(workoutAchievementsLine(summary())).toBe('')
  })
})

describe('hasWorkoutAchievement', () => {
  it('é verdadeiro com qualquer uma das três conquistas', () => {
    expect(hasWorkoutAchievement(summary({ new_achievements: ['first_check_in'] }))).toBe(
      true,
    )
    expect(
      hasWorkoutAchievement(
        summary({ week: { check_ins: 5, target: 5, met_now: true } }),
      ),
    ).toBe(true)
    expect(hasWorkoutAchievement(summary({ records: 1 }))).toBe(true)
  })

  it('é falso sem conquistas', () => {
    expect(hasWorkoutAchievement(summary())).toBe(false)
  })
})
