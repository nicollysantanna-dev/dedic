import { describe, expect, it } from 'vitest'

import { mapHevySetType, normalizeHevyWorkout, type HevyApiWorkout } from './hevy-mapping'

describe('mapHevySetType', () => {
  it('preserva warmup e failure', () => {
    expect(mapHevySetType('warmup')).toBe('warmup')
    expect(mapHevySetType('failure')).toBe('failure')
  })

  it('mapeia normal para normal', () => {
    expect(mapHevySetType('normal')).toBe('normal')
  })

  it('mapeia tipos desconhecidos do Hevy para normal', () => {
    expect(mapHevySetType('dropset')).toBe('normal')
    expect(mapHevySetType('superset')).toBe('normal')
    expect(mapHevySetType(null)).toBe('normal')
    expect(mapHevySetType(undefined)).toBe('normal')
  })
})

describe('normalizeHevyWorkout', () => {
  const raw: HevyApiWorkout = {
    id: 'hevy-1',
    title: 'Peito e tríceps',
    start_time: '2026-09-20T12:00:00Z',
    end_time: '2026-09-20T12:45:00Z',
    exercises: [
      {
        exercise_template_id: 'tpl-bench',
        title: 'Bench Press (Barbell)',
        sets: [
          { type: 'warmup', weight_kg: 40, reps: 10 },
          { type: 'normal', weight_kg: 60, reps: 8 },
        ],
      },
    ],
  }

  it('mantém nome, datas e séries', () => {
    const normalized = normalizeHevyWorkout(raw)
    expect(normalized.name).toBe('Peito e tríceps')
    expect(normalized.started_at).toBe('2026-09-20T12:00:00Z')
    expect(normalized.finished_at).toBe('2026-09-20T12:45:00Z')
    expect(normalized.exercises).toEqual([
      {
        template_id: 'tpl-bench',
        title: 'Bench Press (Barbell)',
        sets: [
          { type: 'warmup', weight_kg: 40, reps: 10 },
          { type: 'normal', weight_kg: 60, reps: 8 },
        ],
      },
    ])
  })

  it('usa um nome padrão quando o treino do Hevy não tem título', () => {
    const normalized = normalizeHevyWorkout({ ...raw, title: null })
    expect(normalized.name).toBe('Treino importado')
  })

  it('usa um nome padrão quando o título é só espaços', () => {
    const normalized = normalizeHevyWorkout({ ...raw, title: '   ' })
    expect(normalized.name).toBe('Treino importado')
  })

  it('trata peso e repetições ausentes como null', () => {
    const normalized = normalizeHevyWorkout({
      ...raw,
      exercises: [
        {
          exercise_template_id: 'tpl-bench',
          title: 'Bench Press (Barbell)',
          sets: [{ type: 'normal' }],
        },
      ],
    })
    expect(normalized.exercises[0].sets[0]).toEqual({
      type: 'normal',
      weight_kg: null,
      reps: null,
    })
  })
})
