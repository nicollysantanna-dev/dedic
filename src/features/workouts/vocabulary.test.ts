import { describe, expect, it } from 'vitest'

import { exerciseDisplayName } from './queries'
import { labelFor } from './vocabulary'

describe('labelFor', () => {
  it('traduz termos conhecidos e capitaliza os demais', () => {
    expect(labelFor('bodyPart', 'upper legs')).toBe('Pernas')
    expect(labelFor('equipment', 'ez barbell')).toBe('Barra W')
    expect(labelFor('muscle', 'lats')).toBe('Dorsais')
    expect(labelFor('muscle', 'unknown term')).toBe('Unknown term')
  })
})

describe('exerciseDisplayName', () => {
  it('prioriza apelido, depois tradução, depois o nome original', () => {
    expect(
      exerciseDisplayName({ alias: 'Supino (meu)', name_pt: 'Supino', name_en: 'bench' }),
    ).toBe('Supino (meu)')
    expect(
      exerciseDisplayName({ alias: null, name_pt: 'Supino', name_en: 'bench' }),
    ).toBe('Supino')
    expect(exerciseDisplayName({ alias: null, name_pt: null, name_en: 'bench' })).toBe(
      'bench',
    )
  })
})
