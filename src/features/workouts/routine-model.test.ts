import { describe, expect, it } from 'vitest'

import {
  emptyRoutine,
  newRoutineExercise,
  newSet,
  serializeRoutine,
} from './routine-model'

const exercise = () =>
  newRoutineExercise({ exerciseId: 'ex-1', externalId: 'EIeI8Vf', name: 'Supino reto' })

describe('serializeRoutine', () => {
  it('exige nome e exercícios', () => {
    expect(serializeRoutine(emptyRoutine(null))).toEqual({
      ok: false,
      error: 'Dê um nome à ficha.',
    })
    expect(serializeRoutine({ ...emptyRoutine(null), name: 'Treino A' })).toEqual({
      ok: false,
      error: 'Adicione pelo menos um exercício.',
    })
  })

  it('valida carga e repetições de cada série', () => {
    const draft = { ...emptyRoutine('s1'), name: 'Treino A', exercises: [exercise()] }
    draft.exercises[0].sets = [{ ...newSet(), weightKg: 'abc', reps: '10' }]
    expect(serializeRoutine(draft)).toEqual({
      ok: false,
      error: 'Supino reto: carga inválida.',
    })
    draft.exercises[0].sets = [{ ...newSet(), weightKg: '40', reps: '0' }]
    expect(serializeRoutine(draft)).toEqual({
      ok: false,
      error: 'Supino reto: repetições inválidas.',
    })
  })

  it('serializa números com vírgula e campos vazios como nulos', () => {
    const draft = { ...emptyRoutine('s1'), name: ' Treino A ', exercises: [exercise()] }
    draft.exercises[0].sets = [
      { ...newSet(), weightKg: '42,5', reps: '12' },
      { ...newSet() },
    ]
    const result = serializeRoutine(draft)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload).toMatchObject({
      name: 'Treino A',
      student_id: 's1',
      exercises: [
        {
          exercise_id: 'ex-1',
          rest_seconds: 90,
          sets: [
            { weight_kg: 42.5, reps: 12 },
            { weight_kg: null, reps: null },
          ],
        },
      ],
    })
  })
})
