import {
  Camera,
  ChevronDown,
  ChevronUp,
  ImageOff,
  LoaderCircle,
  PencilLine,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import {
  exerciseDisplayName,
  exercisePhotoUrl,
  useExerciseDetail,
  useRemoveExercisePhoto,
  useSaveExercisePhoto,
  type ExerciseSearchResult,
} from '@/features/workouts/queries'
import { prepareImage } from '@/lib/image'
import { ExerciseMediaLightbox } from '@/features/workouts/ExerciseMediaLightbox'
import { labelFor } from '@/features/workouts/vocabulary'
import { cn } from '@/lib/utils'

/**
 * Cartão de exercício: nome (apelido > PT > EN), classificação em PT e, ao
 * expandir, GIF e instruções buscados ao vivo no ExerciseDB.
 */
export function ExerciseCard({
  exercise,
  onAlias,
  action,
  trainerId,
}: {
  exercise: ExerciseSearchResult
  onAlias?: (exercise: ExerciseSearchResult) => void
  action?: React.ReactNode
  /** Quando informado, o personal pode cadastrar/remover a foto do aparelho. */
  trainerId?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const name = exerciseDisplayName(exercise)
  const photoUrl = exercisePhotoUrl(exercise.photo_path)
  const secondaryName =
    exercise.alias && exercise.name_pt
      ? exercise.name_pt
      : name !== exercise.name_en
        ? exercise.name_en
        : null

  return (
    <article className="rounded-[1.25rem] bg-white p-4 text-slate-950">
      <div className="flex items-start gap-3">
        {photoUrl && (
          <img
            alt={`Aparelho: ${name}`}
            className="size-14 shrink-0 rounded-xl bg-slate-100 object-cover"
            loading="lazy"
            src={photoUrl}
          />
        )}
        <button
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <p className="font-semibold leading-snug">{name}</p>
          {secondaryName && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{secondaryName}</p>
          )}
          <p className="mt-2 flex flex-wrap gap-1.5">
            {exercise.body_parts.map((part) => (
              <Tag key={part} tone="blue">
                {labelFor('bodyPart', part)}
              </Tag>
            ))}
            {exercise.equipments.map((equipment) => (
              <Tag key={equipment} tone="slate">
                {labelFor('equipment', equipment)}
              </Tag>
            ))}
            {exercise.source === 'custom' && <Tag tone="amber">Seu exercício</Tag>}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {onAlias && (
            <button
              aria-label={`Apelidar ${name}`}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onAlias(exercise)}
              type="button"
            >
              <PencilLine size={16} />
            </button>
          )}
          {action}
          <button
            aria-label={expanded ? 'Recolher' : 'Ver demonstração'}
            className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </div>

      {expanded && <ExerciseDetail exercise={exercise} trainerId={trainerId} />}
    </article>
  )
}

function ExerciseDetail({
  exercise,
  trainerId,
}: {
  exercise: ExerciseSearchResult
  trainerId?: string
}) {
  const detail = useExerciseDetail(exercise.external_id)
  const [zoomed, setZoomed] = useState(false)
  const photoUrl = exercisePhotoUrl(exercise.photo_path)
  const muscles = [
    ...exercise.target_muscles.map((muscle) => labelFor('muscle', muscle)),
    ...exercise.secondary_muscles.map((muscle) => labelFor('muscle', muscle)),
  ]

  return (
    <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-[12rem_1fr]">
      <div className="overflow-hidden rounded-xl bg-slate-100">
        {exercise.source === 'custom' ? (
          <Placeholder text="Exercício personalizado, sem demonstração." />
        ) : detail.isLoading ? (
          <div className="aspect-square animate-pulse bg-slate-200" />
        ) : detail.error || !detail.data ? (
          <Placeholder text="Demonstração indisponível no momento." />
        ) : (
          <button
            aria-label={`Ampliar demonstração de ${exerciseDisplayName(exercise)}`}
            className="block w-full"
            onClick={() => setZoomed(true)}
            type="button"
          >
            <img
              alt={`Demonstração de ${exerciseDisplayName(exercise)}`}
              className="aspect-square w-full object-cover"
              loading="lazy"
              src={detail.data.gifUrl}
            />
          </button>
        )}
      </div>
      <div className="min-w-0 text-sm">
        {muscles.length > 0 && (
          <p className="text-slate-600">
            <span className="font-semibold">Músculos:</span> {muscles.join(', ')}
          </p>
        )}
        {detail.data && detail.data.instructions.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-600">
            {detail.data.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        )}
        {detail.data && detail.data.instructions.length > 0 && (
          <p className="mt-3 text-[0.7rem] text-slate-400">
            Instruções em inglês fornecidas pelo ExerciseDB. Toque na imagem para ampliar.
          </p>
        )}
        {trainerId && (
          <EquipmentPhotoActions
            exercise={exercise}
            trainerId={trainerId}
            photoUrl={photoUrl}
          />
        )}
      </div>
      {zoomed && exercise.external_id && (
        <ExerciseMediaLightbox
          externalId={exercise.external_id}
          name={exerciseDisplayName(exercise)}
          photoUrl={photoUrl}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  )
}

/** Foto do aparelho da academia: tirar/trocar pela câmera ou remover. */
function EquipmentPhotoActions({
  exercise,
  trainerId,
  photoUrl,
}: {
  exercise: ExerciseSearchResult
  trainerId: string
  photoUrl: string | null
}) {
  const save = useSaveExercisePhoto(trainerId)
  const remove = useRemoveExercisePhoto(trainerId)
  const [error, setError] = useState('')
  const pending = save.isPending || remove.isPending

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const prepared = await prepareImage(file)
      await save.mutateAsync({
        exerciseId: exercise.id,
        file: prepared,
        previousPath: exercise.photo_path,
      })
    } catch {
      setError('Não foi possível salvar a foto. Tente novamente.')
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-600">Foto do aparelho</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Fotografe o equipamento da sua academia para seus alunos reconhecerem na hora.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]">
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="equipment-photo-input"
            disabled={pending}
            onChange={(event) => void onFile(event)}
            type="file"
          />
          {pending ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Camera size={16} />
          )}
          {photoUrl ? 'Trocar foto' : 'Tirar foto'}
        </label>
        {photoUrl && exercise.photo_path && (
          <button
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              remove.mutate({
                exerciseId: exercise.id,
                path: exercise.photo_path!,
                alias: exercise.alias,
              })
            }
            type="button"
          >
            <Trash2 size={15} /> Remover foto
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="grid aspect-square place-items-center p-4 text-center text-xs text-slate-500">
      <span>
        <ImageOff className="mx-auto mb-2 text-slate-400" size={20} />
        {text}
      </span>
    </div>
  )
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'blue' | 'slate' | 'amber'
}) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
        tone === 'blue' && 'bg-blue-50 text-blue-700',
        tone === 'slate' && 'bg-slate-100 text-slate-600',
        tone === 'amber' && 'bg-amber-100 text-amber-800',
      )}
    >
      {children}
    </span>
  )
}
