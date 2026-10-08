import { describe, expect, it, vi } from 'vitest'

import { exerciseMediaFrom, exerciseThumbUrl } from './exercise-media'

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${bucket}/${path}` },
        }),
      }),
    },
  }),
}))

const exercise = {
  image_paths: [] as string[],
  animation_path: null,
  instructions: [],
  photo_path: null,
}

describe('exerciseMediaFrom', () => {
  it('mantém a miniatura do GIF animado', () => {
    const media = exerciseMediaFrom(
      {
        ...exercise,
        image_paths: ['gif-pack/plank.thumb.webp'],
        animation_path: 'gif-pack/plank.webp',
      },
      null,
    )
    expect(exerciseThumbUrl(media)).toBe(
      'https://cdn.test/exercise-media/gif-pack/plank.thumb.webp',
    )
  })

  it('descarta fotos de pessoas de exercícios aposentados', () => {
    const media = exerciseMediaFrom(
      { ...exercise, image_paths: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'] },
      null,
    )
    expect(media.images).toEqual([])
    expect(exerciseThumbUrl(media)).toBeNull()
  })
})
