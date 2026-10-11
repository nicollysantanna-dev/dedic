import { describe, expect, it } from 'vitest'

import { applyOrder, reorderItems } from '@/features/workouts/reorder'

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

describe('applyOrder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('ordena os itens pela lista de ids', () => {
    expect(applyOrder(items, ['c', 'a', 'b']).map((item) => item.id)).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('mantém no fim, na ordem original, itens que não estão na lista de ids', () => {
    expect(applyOrder(items, ['b']).map((item) => item.id)).toEqual(['b', 'a', 'c'])
  })

  it('ignora ids que não existem na lista', () => {
    expect(applyOrder(items, ['x', 'c']).map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })
})
