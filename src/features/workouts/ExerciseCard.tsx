import { ChevronDown, ChevronUp, ImageOff, PencilLine } from 'lucide-react'
import { useState } from 'react'

import {
  exerciseDisplayName,
  useExerciseDetail,
  type ExerciseSearchResult,
} from '@/features/workouts/queries'
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
}: {
  exercise: ExerciseSearchResult
  onAlias?: (exercise: ExerciseSearchResult) => void
  action?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const name = exerciseDisplayName(exercise)
  const secondaryName =
    exercise.alias && exercise.name_pt
      ? exercise.name_pt
      : name !== exercise.name_en
        ? exercise.name_en
        : null

  return (
    <article className="rounded-[1.25rem] bg-white p-4 text-slate-950">
      <div className="flex items-start gap-3">
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

      {expanded && <ExerciseDetail exercise={exercise} />}
    </article>
  )
}

function ExerciseDetail({ exercise }: { exercise: ExerciseSearchResult }) {
  const detail = useExerciseDetail(exercise.external_id)
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
          <img
            alt={`Demonstração de ${exerciseDisplayName(exercise)}`}
            className="aspect-square w-full object-cover"
            loading="lazy"
            src={detail.data.gifUrl}
          />
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
            Instruções em inglês fornecidas pelo ExerciseDB.
          </p>
        )}
      </div>
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
