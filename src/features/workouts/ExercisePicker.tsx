import { Camera, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { exerciseThumbUrl, type ExerciseMedia } from '@/features/workouts/exercise-media'
import { ExerciseMediaLightbox } from '@/features/workouts/ExerciseMediaLightbox'
import {
  exerciseDisplayName,
  searchResultMedia,
  useCreateCustomExercise,
  useExerciseSearch,
  type ExerciseSearchResult,
} from '@/features/workouts/queries'
import {
  bodyPartLabels,
  equipmentLabels,
  labelFor,
  muscleLabels,
} from '@/features/workouts/vocabulary'
import { prepareImage } from '@/lib/image'

/**
 * Seletor de exercícios no estilo Hevy: bottom sheet com busca, filtros e
 * lista de linhas (miniatura, nome, músculo). Toque adiciona à ficha.
 * "Criar exercício" cadastra um aparelho que não está no catálogo, com foto.
 */
export function ExercisePicker({
  title = 'Adicionar exercício',
  ownerId,
  onPick,
  onClose,
}: {
  title?: string
  /** Quem cria exercícios próprios (aluno ou personal). */
  ownerId: string
  onPick: (exercise: ExerciseSearchResult) => void
  onClose: () => void
}) {
  const [term, setTerm] = useState('')
  const [bodyPart, setBodyPart] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
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
        aria-label={title}
        aria-modal="true"
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-white text-slate-950 shadow-2xl sm:h-[85dvh] sm:max-w-xl sm:rounded-[1.75rem]"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 className="text-lg font-bold">{title}</h2>
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
          <button
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--brand)]/50 px-3 py-2.5 text-left text-sm font-semibold text-[var(--brand)] transition hover:bg-blue-50"
            onClick={() => setCreating(true)}
            type="button"
          >
            <Plus size={17} /> Criar exercício
            <span className="ml-auto text-xs font-normal text-slate-500">
              Aparelho que não está na lista
            </span>
          </button>
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
                  media={searchResultMedia(exercise)}
                  name={exerciseDisplayName(exercise)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {exerciseDisplayName(exercise)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {exercise.source === 'custom' && 'Exercício próprio · '}
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
              Nenhum exercício encontrado. Você pode criar um com o nome e a foto do
              aparelho.
            </li>
          )}
        </ul>
      </section>
      {creating && (
        <CreateExerciseDialog
          initialName={term}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false)
            onPick(created)
          }}
          ownerId={ownerId}
        />
      )}
    </div>,
    document.body,
  )
}

/** Exercício próprio: nome, classificação e foto do aparelho pela câmera. */
function CreateExerciseDialog({
  ownerId,
  initialName,
  onCreated,
  onClose,
}: {
  ownerId: string
  initialName: string
  onCreated: (exercise: ExerciseSearchResult) => void
  onClose: () => void
}) {
  const create = useCreateCustomExercise(ownerId)
  const [name, setName] = useState(initialName)
  const [bodyPart, setBodyPart] = useState('')
  const [equipment, setEquipment] = useState('')
  const [muscle, setMuscle] = useState('')
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState('')

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const blob = await prepareImage(file)
      if (photo) URL.revokeObjectURL(photo.url)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError('Não foi possível ler a foto.')
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) {
      setError('Dê um nome ao exercício.')
      return
    }
    create.mutate(
      {
        name: name.trim(),
        bodyParts: bodyPart ? [bodyPart] : [],
        equipments: equipment ? [equipment] : [],
        targetMuscles: muscle ? [muscle] : [],
        photo: photo?.blob ?? null,
      },
      {
        onSuccess: onCreated,
        onError: () => setError('Não foi possível criar o exercício. Tente novamente.'),
      },
    )
  }

  return (
    <Dialog
      eyebrow="Exercício próprio"
      onClose={onClose}
      pending={create.isPending}
      title="Criar exercício"
    >
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-semibold text-slate-700">
          Nome
          <input
            autoFocus
            className="field mt-1"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Leg press da academia"
            value={name}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-700">
            Parte do corpo
            <select
              className="field mt-1"
              onChange={(event) => setBodyPart(event.target.value)}
              value={bodyPart}
            >
              <option value="">—</option>
              {Object.entries(bodyPartLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Equipamento
            <select
              className="field mt-1"
              onChange={(event) => setEquipment(event.target.value)}
              value={equipment}
            >
              <option value="">—</option>
              {Object.entries(equipmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Músculo
            <select
              className="field mt-1"
              onChange={(event) => setMuscle(event.target.value)}
              value={muscle}
            >
              <option value="">—</option>
              {Object.entries(muscleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          {photo ? (
            <img
              alt="Foto do aparelho"
              className="size-16 rounded-xl bg-slate-100 object-cover"
              src={photo.url}
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-xl bg-slate-200 text-slate-500">
              <Camera size={20} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700">Foto do aparelho</p>
            <p className="text-xs text-slate-500">
              Opcional, ajuda a reconhecer na academia.
            </p>
            <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[var(--brand)]">
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                data-testid="custom-exercise-photo-input"
                onChange={(event) => void onFile(event)}
                type="file"
              />
              <Camera size={15} /> {photo ? 'Trocar foto' : 'Tirar foto'}
            </label>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button disabled={create.isPending} type="submit">
            {create.isPending && <LoaderCircle className="animate-spin" size={17} />}
            Criar e adicionar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/**
 * Miniatura circular: foto do aparelho > primeira imagem do catálogo > iniciais.
 * Tocar abre a execução em tela cheia.
 */
export function ExerciseThumb({
  media,
  name,
  size = 44,
}: {
  media: ExerciseMedia
  name: string
  size?: number
}) {
  const [open, setOpen] = useState(false)
  const style = { width: size, height: size }
  const imageUrl = exerciseThumbUrl(media)
  if (imageUrl) {
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
            media={media}
            name={name}
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
