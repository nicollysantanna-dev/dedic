import { ChevronDown, ChevronUp, Timer } from 'lucide-react'
import { useState } from 'react'

import { ExerciseThumb } from '@/features/workouts/ExercisePicker'
import { formatRest } from '@/features/workouts/routine-model'
import {
  routineExerciseName,
  type RoutineWithExercises,
} from '@/features/workouts/routine-queries'
import { cn } from '@/lib/utils'

/**
 * Cartão de ficha no estilo Hevy: nome, prévia dos exercícios e, ao expandir,
 * cada exercício com descanso e séries-alvo. As ações (editar, iniciar…) vêm por `actions`.
 */
export function RoutineCard({
  routine,
  trainerId,
  actions,
  className,
}: {
  routine: RoutineWithExercises
  trainerId: string
  actions?: React.ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const names = routine.routine_exercises.map((item) =>
    routineExerciseName(item.exercise, trainerId),
  )

  return (
    <article
      className={cn('rounded-[1.5rem] bg-white p-4 text-slate-950 sm:p-5', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug">{routine.name}</h3>
          {routine.student && (
            <p className="mt-0.5 text-xs text-slate-500">{routine.student.full_name}</p>
          )}
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{names.join(', ')}</p>
        </div>
        <button
          aria-expanded={expanded}
          aria-label={expanded ? 'Recolher ficha' : 'Ver exercícios'}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {expanded && (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {routine.routine_exercises.map((item) => (
            <li key={item.id} className="flex gap-3">
              <ExerciseThumb
                externalId={item.exercise.external_id}
                name={routineExerciseName(item.exercise, trainerId)}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {routineExerciseName(item.exercise, trainerId)}
                </p>
                {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Timer size={12} /> {formatRest(item.rest_seconds)}
                </p>
                <ol className="mt-1 flex flex-wrap gap-1.5">
                  {item.routine_sets.map((set, index) => (
                    <li
                      key={set.id}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                    >
                      <span className="text-slate-400">{index + 1}·</span>{' '}
                      {set.target_weight_kg === null ? '—' : `${set.target_weight_kg} kg`}{' '}
                      × {set.target_reps ?? '—'}
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
          {routine.notes && (
            <li className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {routine.notes}
            </li>
          )}
        </ul>
      )}

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  )
}
