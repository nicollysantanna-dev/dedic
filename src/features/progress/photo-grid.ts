import type { Tables } from '@/lib/supabase/database.types'

type Photo = Tables<'progress_photos'>
type Position = Photo['position']

export const photoPositionOrder: Position[] = ['front', 'side', 'back']

export type PhotoRow = {
  position: Position
  photos: Photo[]
}

/**
 * Agrupa as fotos por posição (frente, lateral, costas), com cada linha em ordem
 * cronológica. Assim o antes e o depois de um mesmo ângulo ficam alinhados.
 * Posições sem fotos não geram linha.
 */
export function groupPhotosByPosition(photos: Photo[]): PhotoRow[] {
  return photoPositionOrder.flatMap((position) => {
    const matching = photos
      .filter((photo) => photo.position === position)
      .sort((a, b) => a.taken_on.localeCompare(b.taken_on))
    return matching.length > 0 ? [{ position, photos: matching }] : []
  })
}
