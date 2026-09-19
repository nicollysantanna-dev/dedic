import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useExerciseDetail } from '@/features/workouts/queries'

/** GIF do exercício em tela cheia, para ver a execução com calma. Fecha com toque ou Escape. */
export function ExerciseMediaLightbox({
  externalId,
  name,
  onClose,
}: {
  externalId: string
  name: string
  onClose: () => void
}) {
  const detail = useExerciseDetail(externalId)

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
        className="flex flex-1 items-center justify-center p-4"
        onClick={onClose}
        type="button"
      >
        {detail.isLoading && (
          <span className="size-48 animate-pulse rounded-2xl bg-white/10" />
        )}
        {detail.error && (
          <span className="text-sm text-slate-300">
            Demonstração indisponível no momento.
          </span>
        )}
        {detail.data && (
          <img
            alt={`Demonstração de ${name}`}
            className="max-h-full w-full max-w-lg rounded-2xl bg-white object-contain"
            src={detail.data.gifUrl}
          />
        )}
      </button>
      {detail.data && detail.data.instructions.length > 0 && (
        <details className="mx-4 mb-6 rounded-2xl bg-white/10 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Instruções (inglês)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-200">
            {detail.data.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>
      )}
    </div>,
    document.body,
  )
}
