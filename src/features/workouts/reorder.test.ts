import { describe, expect, it } from 'vitest'

import { reorderItems } from '@/features/workouts/reorder'

describe('reorderItems', () => {
  it('move um item para uma posição mais abaixo', () => {
    expect(reorderItems(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('move um item para uma posição mais acima', () => {
    expect(reorderItems(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('não altera a lista quando origem e destino são iguais', () => {
    expect(reorderItems(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('não muda a lista recebida', () => {
    const input = ['a', 'b', 'c']
    reorderItems(input, 0, 2)
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('ignora índices fora da lista', () => {
    expect(reorderItems(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
    expect(reorderItems(['a', 'b'], 0, 9)).toEqual(['a', 'b'])
  })
})
