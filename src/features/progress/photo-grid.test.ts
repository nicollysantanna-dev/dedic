import { describe, expect, it } from 'vitest'

import { groupPhotosByPosition } from '@/features/progress/photo-grid'

const photo = (id: string, position: 'front' | 'side' | 'back', takenOn: string) =>
  ({ id, position, taken_on: takenOn }) as Parameters<
    typeof groupPhotosByPosition
  >[0][number]

describe('groupPhotosByPosition', () => {
  it('agrupa por posição na ordem frente, lateral, costas', () => {
    const rows = groupPhotosByPosition([
      photo('b1', 'back', '2026-09-16'),
      photo('f1', 'front', '2026-09-16'),
      photo('s1', 'side', '2026-09-16'),
    ])

    expect(rows.map((row) => row.position)).toEqual(['front', 'side', 'back'])
  })

  it('ordena cada posição da data mais antiga para a mais recente', () => {
    const rows = groupPhotosByPosition([
      photo('f2', 'front', '2026-10-09'),
      photo('f1', 'front', '2026-09-16'),
      photo('f3', 'front', '2026-10-10'),
    ])

    expect(rows[0].photos.map((item) => item.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('omite posições sem fotos', () => {
    const rows = groupPhotosByPosition([photo('s1', 'side', '2026-06-10')])

    expect(rows.map((row) => row.position)).toEqual(['side'])
  })

  it('não altera a lista recebida', () => {
    const input = [photo('f2', 'front', '2026-10-09'), photo('f1', 'front', '2026-09-16')]

    groupPhotosByPosition(input)

    expect(input.map((item) => item.id)).toEqual(['f2', 'f1'])
  })

  it('retorna nenhuma linha quando não há fotos', () => {
    expect(groupPhotosByPosition([])).toEqual([])
  })
})
