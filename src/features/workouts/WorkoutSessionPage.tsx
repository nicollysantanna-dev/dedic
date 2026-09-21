import {
  Check,
  LoaderCircle,
  MoreVertical,
  Plus,
  Repeat,
  Timer,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/auth-context'
import { exerciseMediaFrom } from '@/features/workouts/exercise-media'
import { ExercisePicker, ExerciseThumb } from '@/features/workouts/ExercisePicker'
import { RestTimer } from '@/features/workouts/RestTimer'
import { restOptions } from '@/features/workouts/routine-model'
import { formatDuration, formatKg, totalVolume } from '@/features/workouts/workout-math'
import {
  useAddSet,
  useAddWorkoutExercise,
  useDiscardWorkout,
  useFinishWorkout,
  useRemoveSet,
  useRemoveWorkoutExercise,
  useReplaceWorkoutExercise,
  useUpdateSet,
  useUpdateWorkoutExercise,
  useWorkoutSession,
  workoutExerciseName,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSet,
} from '@/features/workouts/workout-queries'
import { cn } from '@/lib/utils'

type Rest = { endsAt: number; total: number }

/**
 * Sessão de treino no estilo Hevy: cronômetro, blocos por exercício com
 * SÉRIE · ANTERIOR · KG · REPS · ✓, descanso automático ao concluir uma série,
 * adicionar série/exercício e finalizar com resumo.
 */
export function WorkoutSessionPage() {
  const { profile } = useAuth()
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const session = useWorkoutSession(workoutId ?? null)
  const [rest, setRest] = useState<Rest | null>(null)
  // Seletor aberto para adicionar ou para substituir um exercício (id do bloco).
  const [picker, setPicker] = useState<
    { mode: 'add' } | { mode: 'replace'; id: string } | null
  >(null)
  const [finishing, setFinishing] = useState(false)
  const [summary, setSummary] = useState<{
    sets: number
    volume: number
    seconds: number
  } | null>(null)
  const addExercise = useAddWorkoutExercise(workoutId ?? '')
  const replaceExercise = useReplaceWorkoutExercise(workoutId ?? '')
  const discard = useDiscardWorkout()

  const backTo =
    profile?.role === 'trainer' && session.data
      ? `/app/alunos/${session.data.student_id}`
      : '/app/treinos'

  if (!profile) return null
  if (session.isLoading) return <Shell title="Carregando treino…" />
  if (session.error || !session.data) {
    return (
      <Shell title="Treino não encontrado">
        <Link
          className="mt-3 inline-block text-sm text-[var(--brand)] underline"
          to="/app/treinos"
        >
          Voltar para treinos
        </Link>
      </Shell>
    )
  }
  const workout = session.data
  const finished = workout.finished_at !== null || workout.discarded_at !== null

  if (summary) {
    return (
      <Shell title="Treino finalizado!">
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Duração" value={formatDuration(summary.seconds)} />
          <Stat label="Séries" value={String(summary.sets)} />
          <Stat label="Volume" value={formatKg(summary.volume)} />
        </div>
        <Button asChild className="mt-6">
          <Link to={backTo}>Concluir</Link>
        </Button>
      </Shell>
    )
  }

  return (
    <main className="min-h-dvh px-4 pb-40 pt-5 text-white sm:px-7 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">
              {finished ? (
                'Treino encerrado'
              ) : (
                <ElapsedClock since={workout.started_at} />
              )}
            </p>
            <h1 className="truncate text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              {workout.name}
            </h1>
          </div>
          {!finished && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setFinishing(true)}
            >
              Finalizar
            </Button>
          )}
        </header>

        <div className="mt-5 space-y-4">
          {workout.workout_exercises.map((item) => (
            <ExerciseSessionBlock
              key={item.id}
              exercise={item}
              trainerId={workout.trainer_id}
              workoutId={workout.id}
              readOnly={finished}
              onReplace={() => setPicker({ mode: 'replace', id: item.id })}
              onSetCompleted={(restSeconds) => {
                if (restSeconds && restSeconds > 0) {
                  setRest({ endsAt: Date.now() + restSeconds * 1000, total: restSeconds })
                }
              }}
            />
          ))}
          {workout.workout_exercises.length === 0 && (
            <p className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-400">
              Adicione o primeiro exercício para começar.
            </p>
          )}
        </div>

        {!finished && (
          <>
            <Button
              className="mt-4 w-full border-blue-400/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
              disabled={addExercise.isPending}
              onClick={() => setPicker({ mode: 'add' })}
              variant="outline"
            >
              <Plus size={17} /> Adicionar exercício
            </Button>
            <button
              className="mt-6 w-full text-sm font-semibold text-red-300 hover:text-red-200"
              onClick={() => {
                if (
                  window.confirm(
                    'Descartar este treino? As séries registradas serão perdidas.',
                  )
                ) {
                  discard.mutate(workout.id, {
                    onSuccess: () => void navigate(backTo, { replace: true }),
                  })
                }
              }}
              type="button"
            >
              Descartar treino
            </button>
          </>
        )}

        {picker && (
          <ExercisePicker
            onClose={() => setPicker(null)}
            onPick={(picked) => {
              if (picker.mode === 'add') addExercise.mutate(picked.id)
              else
                replaceExercise.mutate({
                  workoutExerciseId: picker.id,
                  exerciseId: picked.id,
                })
              setPicker(null)
            }}
            ownerId={profile.id}
            title={picker.mode === 'add' ? 'Adicionar exercício' : 'Substituir exercício'}
          />
        )}
        {rest && (
          <RestTimer
            endsAt={rest.endsAt}
            totalSeconds={rest.total}
            onExtend={() =>
              setRest({ endsAt: rest.endsAt + 30_000, total: rest.total + 30 })
            }
            onSkip={() => setRest(null)}
          />
        )}
        {finishing && (
          <FinishDialog
            workout={workout}
            onClose={() => setFinishing(false)}
            onFinished={(result) => {
              setFinishing(false)
              setSummary(result)
            }}
          />
        )}
      </div>
    </main>
  )
}

function ElapsedClock({ since }: { since: string }) {
  const [seconds, setSeconds] = useState(() =>
    Math.floor((Date.now() - new Date(since).getTime()) / 1000),
  )
  useEffect(() => {
    const interval = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - new Date(since).getTime()) / 1000)),
      1000,
    )
    return () => window.clearInterval(interval)
  }, [since])
  return <span className="tabular-nums">{formatDuration(Math.max(0, seconds))}</span>
}

function ExerciseSessionBlock({
  exercise,
  trainerId,
  workoutId,
  readOnly,
  onReplace,
  onSetCompleted,
}: {
  exercise: WorkoutExercise
  trainerId: string | null
  workoutId: string
  readOnly: boolean
  onReplace: () => void
  onSetCompleted: (restSeconds: number | null) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const name = workoutExerciseName(exercise.exercise, trainerId)
  const updateSet = useUpdateSet(workoutId)
  const addSet = useAddSet(workoutId)
  const removeSet = useRemoveSet(workoutId)
  const updateExercise = useUpdateWorkoutExercise(workoutId)
  const removeExercise = useRemoveWorkoutExercise(workoutId)

  return (
    <section className="rounded-[1.5rem] bg-white p-4 text-slate-950 sm:p-5">
      <div className="flex items-center gap-3">
        <ExerciseThumb
          media={exerciseMediaFrom(exercise.exercise, trainerId)}
          name={name}
        />
        <h2 className="min-w-0 flex-1 truncate font-semibold text-[var(--brand)]">
          {name}
        </h2>
        {!readOnly && (
          <div className="relative">
            <button
              aria-expanded={menuOpen}
              aria-label={`Opções de ${name}`}
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                  onClick={() => {
                    onReplace()
                    setMenuOpen(false)
                  }}
                  type="button"
                >
                  <Repeat size={15} /> Substituir exercício
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-600 hover:bg-slate-50"
                  onClick={() => removeExercise.mutate(exercise.id)}
                  type="button"
                >
                  <Trash2 size={15} /> Remover exercício
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <NotesField
        exerciseId={exercise.id}
        initial={exercise.notes ?? ''}
        name={name}
        readOnly={readOnly}
        onSave={(notes) =>
          updateExercise.mutate({ id: exercise.id, patch: { notes: notes || null } })
        }
      />

      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--brand)]">
        <Timer size={16} />
        <span className="sr-only">Descanso de {name}</span>
        <select
          className="border-0 bg-transparent font-semibold outline-none"
          disabled={readOnly}
          onChange={(event) =>
            updateExercise.mutate({
              id: exercise.id,
              patch: {
                rest_seconds:
                  event.target.value === '' ? null : Number(event.target.value),
              },
            })
          }
          value={exercise.rest_seconds ?? ''}
        >
          {restOptions.map((option) => (
            <option key={option.label} value={option.value ?? ''}>
              Descanso: {option.label}
            </option>
          ))}
        </select>
      </label>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
            <th className="w-10 pb-1 text-left">Série</th>
            <th className="w-20 pb-1 text-left">Anterior</th>
            <th className="pb-1 text-left">Kg</th>
            <th className="pb-1 text-left">Reps</th>
            <th className="w-10 pb-1 text-center">
              <Check className="mx-auto" size={13} />
            </th>
          </tr>
        </thead>
        <tbody>
          {exercise.workout_sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              index={index}
              name={name}
              readOnly={readOnly}
              onChange={(patch) => updateSet.mutate({ setId: set.id, patch })}
              onComplete={(completed) => {
                updateSet.mutate({
                  setId: set.id,
                  patch: { completed_at: completed ? new Date().toISOString() : null },
                })
                if (completed) onSetCompleted(exercise.rest_seconds)
              }}
              onRemove={() => removeSet.mutate(set.id)}
            />
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button
          className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          disabled={addSet.isPending}
          onClick={() => {
            const last = exercise.workout_sets.at(-1)
            addSet.mutate({
              workoutExerciseId: exercise.id,
              position: (last?.position ?? -1) + 1,
              weightKg: last?.weight_kg ?? null,
              reps: last?.reps ?? null,
            })
          }}
          type="button"
        >
          + Adicionar série
        </button>
      )}
    </section>
  )
}

function SetRow({
  set,
  index,
  name,
  readOnly,
  onChange,
  onComplete,
  onRemove,
}: {
  set: WorkoutSet
  index: number
  name: string
  readOnly: boolean
  onChange: (patch: { weight_kg?: number | null; reps?: number | null }) => void
  onComplete: (completed: boolean) => void
  onRemove: () => void
}) {
  const [weight, setWeight] = useState(
    set.weight_kg === null ? '' : String(set.weight_kg),
  )
  const [reps, setReps] = useState(set.reps === null ? '' : String(set.reps))
  const done = set.completed_at !== null
  const previous =
    set.previous_weight_kg !== null || set.previous_reps !== null
      ? `${set.previous_weight_kg ?? '—'} × ${set.previous_reps ?? '—'}`
      : '—'

  const parse = (value: string) => {
    const parsed = Number(value.replace(',', '.'))
    return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed
  }

  return (
    <tr className={cn('border-t border-slate-50', done && 'bg-emerald-50/70')}>
      <td className="py-1.5 font-semibold text-slate-500">{index + 1}</td>
      <td className="py-1.5 text-xs text-slate-400">{previous}</td>
      <td className="py-1.5 pr-2">
        <input
          aria-label={`Carga da série ${index + 1} de ${name}`}
          className="field h-9 rounded-lg bg-slate-50 px-2 text-center disabled:bg-transparent"
          disabled={readOnly}
          inputMode="decimal"
          onBlur={() => onChange({ weight_kg: parse(weight) })}
          onChange={(event) => setWeight(event.target.value)}
          placeholder={
            set.previous_weight_kg === null ? '—' : String(set.previous_weight_kg)
          }
          value={weight}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          aria-label={`Repetições da série ${index + 1} de ${name}`}
          className="field h-9 rounded-lg bg-slate-50 px-2 text-center disabled:bg-transparent"
          disabled={readOnly}
          inputMode="numeric"
          onBlur={() => onChange({ reps: parse(reps) })}
          onChange={(event) => setReps(event.target.value)}
          placeholder={set.previous_reps === null ? '—' : String(set.previous_reps)}
          value={reps}
        />
      </td>
      <td className="py-1.5 text-center">
        {readOnly ? (
          done && <Check className="mx-auto text-emerald-600" size={16} />
        ) : (
          <button
            aria-label={`${done ? 'Desmarcar' : 'Concluir'} série ${index + 1} de ${name}`}
            aria-pressed={done}
            className={cn(
              'grid size-9 place-items-center rounded-lg transition',
              done
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
            )}
            onClick={() => {
              // Garante que os valores digitados sejam gravados antes de concluir.
              onChange({ weight_kg: parse(weight), reps: parse(reps) })
              onComplete(!done)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              onRemove()
            }}
            type="button"
          >
            <Check size={16} />
          </button>
        )}
      </td>
    </tr>
  )
}

function NotesField({
  exerciseId,
  initial,
  name,
  readOnly,
  onSave,
}: {
  exerciseId: string
  initial: string
  name: string
  readOnly: boolean
  onSave: (notes: string) => void
}) {
  const [notes, setNotes] = useState(initial)
  if (readOnly && !initial) return null
  return (
    <input
      aria-label={`Notas de ${name}`}
      className="mt-3 w-full border-0 border-b border-slate-100 bg-transparent pb-1 text-sm outline-none placeholder:text-slate-400 focus:border-[var(--brand)] disabled:border-transparent"
      disabled={readOnly}
      key={exerciseId}
      maxLength={300}
      onBlur={() => notes !== initial && onSave(notes)}
      onChange={(event) => setNotes(event.target.value)}
      placeholder="Adicionar notas…"
      value={notes}
    />
  )
}

function FinishDialog({
  workout,
  onClose,
  onFinished,
}: {
  workout: WorkoutSession
  onClose: () => void
  onFinished: (summary: { sets: number; volume: number; seconds: number }) => void
}) {
  const [notes, setNotes] = useState('')
  const finish = useFinishWorkout()
  const completed = useMemo(
    () =>
      workout.workout_exercises.flatMap((item) =>
        item.workout_sets.filter((set) => set.completed_at !== null),
      ),
    [workout],
  )
  const volume = totalVolume(
    completed.map((set) => ({ weightKg: set.weight_kg, reps: set.reps })),
  )
  const pending = workout.workout_exercises.reduce(
    (total, item) =>
      total + item.workout_sets.filter((set) => set.completed_at === null).length,
    0,
  )

  return (
    <Dialog
      title="Finalizar treino"
      eyebrow="Sessão"
      onClose={onClose}
      pending={finish.isPending}
    >
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Séries concluídas" value={String(completed.length)} dark={false} />
        <Stat label="Volume" value={formatKg(volume)} dark={false} />
      </div>
      {pending > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {pending} série{pending === 1 ? '' : 's'} não concluída
          {pending === 1 ? '' : 's'} ser
          {pending === 1 ? 'á' : 'ão'} descartada{pending === 1 ? '' : 's'}.
        </p>
      )}
      {completed.length === 0 && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          Conclua pelo menos uma série para finalizar.
        </p>
      )}
      <label className="mt-4 block text-sm font-semibold">
        Como foi o treino? (opcional)
        <textarea
          className="field mt-2 min-h-20 py-2"
          maxLength={500}
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </label>
      {finish.error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          Não foi possível finalizar. Tente novamente.
        </p>
      )}
      <Button
        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={finish.isPending || completed.length === 0}
        onClick={() =>
          finish.mutate(
            { workoutId: workout.id, notes },
            {
              onSuccess: (result) =>
                onFinished({
                  sets: completed.length,
                  volume,
                  seconds: result.duration_seconds ?? 0,
                }),
            },
          )
        }
      >
        {finish.isPending && <LoaderCircle className="animate-spin" size={17} />}
        Finalizar treino
      </Button>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  dark = true,
}: {
  label: string
  value: string
  dark?: boolean
}) {
  return (
    <div className={cn('rounded-xl p-3', dark ? 'bg-white/5' : 'bg-slate-50')}>
      <p className={cn('text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}

function Shell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  )
}
