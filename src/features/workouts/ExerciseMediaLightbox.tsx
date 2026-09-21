import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  exerciseImageUrl,
  exercisePhotoUrl,
  type ExerciseMedia,
} from '@/features/workouts/exercise-media'

/**
 * Execução do exercício em tela cheia: foto do aparelho (se houver) e as duas
 * posições do movimento alternando como animação. Fecha com toque ou Escape.
 */
export function ExerciseMediaLightbox({
  media,
  name,
  onClose,
}: {
  media: ExerciseMedia
  name: string
  onClose: () => void
}) {
  const photoUrl = exercisePhotoUrl(media.photoPath)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div
      aria-label={`Execução de ${name}`}
      aria-modal="true"
      className="fixed inset-0 z-[90] flex flex-col bg-slate-950/95 text-white"
      role="dialog"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="min-w-0 truncate text-base font-bold">{name}</h2>
        <button
          aria-label="Fechar"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
      </header>
      <button
        aria-label="Fechar demonstração"
        className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-4"
        onClick={onClose}
        type="button"
      >
        {photoUrl && (
          <figure className="w-full max-w-lg">
            <img
              alt={`Aparelho: ${name}`}
              className="max-h-[45dvh] w-full rounded-2xl bg-white object-contain"
              src={photoUrl}
            />
            <figcaption className="mt-1 text-xs text-slate-300">
              Aparelho da sua academia
            </figcaption>
          </figure>
        )}
        {media.images.length > 0 && (
          <ExerciseAnimation
            className={
              photoUrl
                ? 'max-h-[40dvh] w-full max-w-lg rounded-2xl bg-white object-contain'
                : 'max-h-full w-full max-w-lg rounded-2xl bg-white object-contain'
            }
            images={media.images}
            name={name}
          />
        )}
        {!photoUrl && media.images.length === 0 && (
          <span className="text-sm text-slate-300">
            Sem demonstração para este exercício.
          </span>
        )}
      </button>
      {media.instructions.length > 0 && (
        <details className="mx-4 mb-6 rounded-2xl bg-white/10 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Instruções (inglês)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-200">
            {media.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>
      )}
    </div>,
    document.body,
  )
}

/** Alterna as posições inicial e final do movimento, como um GIF de dois quadros. */
export function ExerciseAnimation({
  images,
  name,
  className,
  intervalMs = 900,
}: {
  images: string[]
  name: string
  className?: string
  intervalMs?: number
}) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (images.length < 2) return
    const timer = window.setInterval(
      () => setFrame((current) => (current + 1) % images.length),
      intervalMs,
    )
    return () => window.clearInterval(timer)
  }, [images.length, intervalMs])
  const src = exerciseImageUrl(images[frame] ?? images[0])
  if (!src) return null
  return <img alt={`Demonstração de ${name}`} className={className} src={src} />
}
