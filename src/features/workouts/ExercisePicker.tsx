import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { ExerciseMediaLightbox } from '@/features/workouts/ExerciseMediaLightbox'

import {
  exerciseDisplayName,
  exercisePhotoUrl,
  useExerciseDetail,
  useExerciseSearch,
  type ExerciseSearchResult,
} from '@/features/workouts/queries'
import { bodyPartLabels, equipmentLabels, labelFor } from '@/features/workouts/vocabulary'

/**
 * Seletor de exercícios no estilo Hevy: bottom sheet com busca, filtros e
 * lista de linhas (miniatura, nome, músculo). Toque adiciona à ficha.
 */
export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (exercise: ExerciseSearchResult) => void
  onClose: () => void
}) {
  const [term, setTerm] = useState('')
  const [bodyPart, setBodyPart] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const results = useExerciseSearch({ term, bodyPart, equipment })

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        aria-label="Fechar seletor"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Adicionar exercício"
        aria-modal="true"
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-white text-slate-950 shadow-2xl sm:h-[85dvh] sm:max-w-xl sm:rounded-[1.75rem]"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 className="text-lg font-bold">Adicionar exercício</h2>
          <button
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>
        <div className="space-y-2 px-5 pt-3">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <span className="sr-only">Buscar exercício</span>
            <input
              autoFocus
              className="field pl-10"
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar exercício"
              type="search"
              value={term}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Parte do corpo"
              className="field"
              onChange={(event) => setBodyPart(event.target.value || null)}
              value={bodyPart ?? ''}
            >
              <option value="">Todas as partes</option>
              {Object.entries(bodyPartLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Equipamento"
              className="field"
              onChange={(event) => setEquipment(event.target.value || null)}
              value={equipment ?? ''}
            >
              <option value="">Todos os equipamentos</option>
              {Object.entries(equipmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ul className="mt-3 flex-1 overflow-y-auto border-t border-slate-100">
          {results.isLoading && (
            <li className="p-6 text-center text-sm text-slate-500">Carregando…</li>
          )}
          {results.error && (
            <li className="p-6 text-center text-sm text-red-700" role="alert">
              Não foi possível buscar os exercícios.
            </li>
          )}
          {results.data?.map((exercise) => (
            <li key={exercise.id}>
              <button
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                onClick={() => onPick(exercise)}
                type="button"
              >
                <ExerciseThumb
                  externalId={exercise.external_id}
                  name={exerciseDisplayName(exercise)}
                  photoPath={exercise.photo_path}
                  withMedia={false}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {exerciseDisplayName(exercise)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {exercise.target_muscles
                      .map((muscle) => labelFor('muscle', muscle))
                      .join(', ') || labelFor('bodyPart', exercise.body_parts[0] ?? '')}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {results.data && results.data.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">
              Nenhum exercício encontrado.
            </li>
          )}
        </ul>
      </section>
    </div>,
    document.body,
  )
}

/**
 * Miniatura circular do GIF (ao vivo). Tocar abre a execução em tela cheia.
 * Sem imagem, mostra as iniciais.
 */
export function ExerciseThumb({
  externalId,
  name,
  photoPath = null,
  size = 44,
  withMedia = true,
}: {
  externalId: string | null
  name: string
  /** Foto do aparelho (nosso CDN): tem prioridade e não consome a API. */
  photoPath?: string | null
  size?: number
  /** Listas longas (seletor) não buscam o GIF, para respeitar o limite da API. */
  withMedia?: boolean
}) {
  const photoUrl = exercisePhotoUrl(photoPath)
  const detail = useExerciseDetail(withMedia && !photoUrl ? externalId : null)
  const [open, setOpen] = useState(false)
  const style = { width: size, height: size }
  const imageUrl = photoUrl ?? detail.data?.gifUrl ?? null
  if (imageUrl && (externalId || photoUrl)) {
    return (
      <>
        <button
          aria-label={`Ver execução de ${name}`}
          className="shrink-0 overflow-hidden rounded-full bg-slate-100 ring-offset-2 transition hover:ring-2 hover:ring-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          onClick={(event) => {
            event.stopPropagation()
            setOpen(true)
          }}
          style={style}
          type="button"
        >
          <img alt="" className="size-full object-cover" loading="lazy" src={imageUrl} />
        </button>
        {open && (
          <ExerciseMediaLightbox
            externalId={externalId}
            name={name}
            photoUrl={photoUrl}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700"
      style={style}
    >
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')}
    </span>
  )
}
