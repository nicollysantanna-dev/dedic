import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyMedia } from './exercise-media'
import { ExerciseAnimation, ExerciseMediaLightbox } from './ExerciseMediaLightbox'

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

afterEach(() => vi.useRealTimers())

describe('ExerciseAnimation', () => {
  it('mostra o GIF animado do pacote e não alterna as fotos', () => {
    vi.useFakeTimers()
    render(
      <ExerciseAnimation
        animationPath="gif-pack/barbell-curl.webp"
        images={['gif-pack/barbell-curl.thumb.webp']}
        name="Rosca direta"
      />,
    )
    const image = screen.getByRole('img', { name: 'Demonstração de Rosca direta' })
    expect(image).toHaveAttribute(
      'src',
      'https://cdn.test/exercise-media/gif-pack/barbell-curl.webp',
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(image).toHaveAttribute(
      'src',
      'https://cdn.test/exercise-media/gif-pack/barbell-curl.webp',
    )
  })

  it('sem animação, alterna as duas posições do catálogo', () => {
    vi.useFakeTimers()
    render(<ExerciseAnimation images={['Curl/0.jpg', 'Curl/1.jpg']} name="Rosca" />)
    const image = screen.getByRole('img', { name: 'Demonstração de Rosca' })
    expect(image).toHaveAttribute('src', 'https://cdn.test/exercise-media/Curl/0.jpg')
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(image).toHaveAttribute('src', 'https://cdn.test/exercise-media/Curl/1.jpg')
  })
})

describe('ExerciseMediaLightbox', () => {
  it('mostra a animação mesmo sem imagens estáticas', async () => {
    const onClose = vi.fn()
    render(
      <ExerciseMediaLightbox
        media={{ ...emptyMedia, animationPath: 'gif-pack/plank.webp' }}
        name="Prancha"
        onClose={onClose}
      />,
    )
    expect(screen.getByRole('img', { name: 'Demonstração de Prancha' })).toHaveAttribute(
      'src',
      'https://cdn.test/exercise-media/gif-pack/plank.webp',
    )
    expect(screen.queryByText('Sem demonstração para este exercício.')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('avisa quando não há nenhuma demonstração', () => {
    render(<ExerciseMediaLightbox media={emptyMedia} name="Próprio" onClose={vi.fn()} />)
    expect(screen.getByText('Sem demonstração para este exercício.')).toBeInTheDocument()
  })
})
