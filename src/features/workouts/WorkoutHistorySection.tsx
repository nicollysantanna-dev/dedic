import { ChevronRight, Clock, Dumbbell, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatDateTime } from '@/lib/format'
import {
  useWorkoutHistory,
  workoutExerciseName,
  type WorkoutHistoryItem,
} from '@/features/workouts/workout-queries'
import { formatDuration, formatKg, totalVolume } from '@/features/workouts/workout-math'

/** Sessões finalizadas (estilo Hevy): nome, quando, duração, volume, recordes e exercícios. */
export function WorkoutHistorySection({
  studentId,
  limit,
  emptyMessage = 'Nenhum treino finalizado ainda.',
}: {
  studentId: string
  limit?: number
  emptyMessage?: string
}) {
  const history = useWorkoutHistory(studentId)

  if (history.isLoading) {
    return <p className="p-6 text-center text-sm text-slate-400">Carregando histórico…</p>
  }
  if (history.error) {
    return (
      <p className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-100" role="alert">
        Não foi possível carregar o histórico.
      </p>
    )
  }
  const items = limit ? (history.data ?? []).slice(0, limit) : (history.data ?? [])
  if (items.length === 0) {
    return (
      <p className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-400">
        {emptyMessage}
      </p>
    )
  }
  return (
    <ul className="grid gap-3">
      {items.map((workout) => (
        <li key={workout.id}>
          <WorkoutHistoryCard workout={workout} />
        </li>
      ))}
    </ul>
  )
}

export function WorkoutHistoryCard({ workout }: { workout: WorkoutHistoryItem }) {
  const sets = workout.workout_exercises.flatMap((item) => item.workout_sets)
  const volume = totalVolume(
    sets.map((set) => ({ weightKg: set.weight_kg, reps: set.reps })),
  )
  return (
    <Link
      className="block rounded-[1.5rem] bg-white p-4 text-slate-950 transition hover:bg-slate-50 sm:p-5"
      to={`/app/treinos/sessao/${workout.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{workout.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateTime(workout.finished_at ?? workout.started_at)}
          </p>
        </div>
        <ChevronRight className="shrink-0 text-slate-400" size={18} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <Clock size={13} />
          <dt className="sr-only">Duração</dt>
          <dd>{formatDuration(workout.duration_seconds ?? 0)}</dd>
        </div>
        <div className="flex items-center gap-1">
          <Dumbbell size={13} />
          <dt className="sr-only">Volume</dt>
          <dd>
            {formatKg(volume)} · {sets.length} série{sets.length === 1 ? '' : 's'}
          </dd>
        </div>
        {workout.record_count > 0 && (
          <div className="flex items-center gap-1 font-semibold text-amber-700">
            <Trophy size={13} />
            <dt className="sr-only">Recordes</dt>
            <dd>
              {workout.record_count} recorde{workout.record_count === 1 ? '' : 's'}
            </dd>
          </div>
        )}
      </dl>
      <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
        {workout.workout_exercises.map((item, index) => (
          <li key={index} className="truncate">
            {item.workout_sets.length}×{' '}
            {workoutExerciseName(item.exercise, workout.trainer_id)}
          </li>
        ))}
      </ul>
    </Link>
  )
}
