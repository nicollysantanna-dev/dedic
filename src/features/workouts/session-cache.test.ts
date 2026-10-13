import { describe, expect, it } from 'vitest'

import { applySetPatch } from '@/features/workouts/session-cache'
import type { WorkoutSession, WorkoutSet } from '@/features/workouts/workout-queries'

function set(id: string, patch: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id,
    position: 0,
    set_type: 'normal',
    weight_kg: 20,
    reps: 10,
    previous_weight_kg: null,
    previous_reps: null,
    completed_at: null,
    record_kinds: [],
    ...patch,
  }
}

function session(): WorkoutSession {
  return {
    id: 'workout-1',
    workout_exercises: [
      {
        id: 'we-1',
        position: 0,
        notes: null,
        rest_seconds: null,
        exercise: {} as WorkoutSession['workout_exercises'][number]['exercise'],
        workout_sets: [set('s-1'), set('s-2')],
      },
      {
        id: 'we-2',
        position: 1,
        notes: null,
        rest_seconds: null,
        exercise: {} as WorkoutSession['workout_exercises'][number]['exercise'],
        workout_sets: [set('s-3')],
      },
    ],
  } as unknown as WorkoutSession
}

describe('applySetPatch', () => {
  it('marca somente a série alvo como concluída', () => {
    const completedAt = '2026-10-12T10:00:00.000Z'
    const result = applySetPatch(session(), 's-2', { completed_at: completedAt })

    expect(result.workout_exercises[0].workout_sets[1].completed_at).toBe(completedAt)
    expect(result.workout_exercises[0].workout_sets[0].completed_at).toBeNull()
    expect(result.workout_exercises[1].workout_sets[0].completed_at).toBeNull()
  })

  it('preserva a referência de blocos e séries não afetados', () => {
    const before = session()
    const result = applySetPatch(before, 's-2', { reps: 12 })

    expect(result.workout_exercises[1]).toBe(before.workout_exercises[1])
    expect(result.workout_exercises[0].workout_sets[0]).toBe(
      before.workout_exercises[0].workout_sets[0],
    )
  })

  it('não altera o cache original', () => {
    const before = session()
    applySetPatch(before, 's-1', { weight_kg: 30, completed_at: 'agora' })

    expect(before.workout_exercises[0].workout_sets[0].weight_kg).toBe(20)
    expect(before.workout_exercises[0].workout_sets[0].completed_at).toBeNull()
  })

  it('grava valores e conclusão juntos, e desfaz a conclusão com null', () => {
    const done = applySetPatch(session(), 's-1', {
      weight_kg: 25,
      reps: 8,
      completed_at: '2026-10-12T10:00:00.000Z',
    })
    const undone = applySetPatch(done, 's-1', { completed_at: null })

    expect(done.workout_exercises[0].workout_sets[0]).toMatchObject({
      weight_kg: 25,
      reps: 8,
    })
    expect(undone.workout_exercises[0].workout_sets[0].completed_at).toBeNull()
    expect(undone.workout_exercises[0].workout_sets[0].weight_kg).toBe(25)
  })
})
