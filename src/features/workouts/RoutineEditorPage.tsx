import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  LoaderCircle,
  MoreVertical,
  Plus,
  Repeat,
  Timer,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { exerciseMediaFrom } from '@/features/workouts/exercise-media'
import { ExercisePicker, ExerciseThumb } from '@/features/workouts/ExercisePicker'
import { exerciseDisplayName, searchResultMedia } from '@/features/workouts/queries'
import {
  emptyRoutine,
  newRoutineExercise,
  newSet,
  restOptions,
  serializeRoutine,
  type RoutineDraft,
  type RoutineExerciseDraft,
} from '@/features/workouts/routine-model'
import {
  routineExerciseName,
  useRoutine,
  useSaveRoutine,
  type RoutineWithExercises,
} from '@/features/workouts/routine-queries'
import { requireSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

/**
 * Editor de ficha no estilo Hevy: título, aluno, blocos por exercício com
 * notas, descanso e tabela de séries (SÉRIE · KG · REPS), "+ Adicionar série"
 * e "+ Adicionar exercício" abrindo o seletor.
 */
export function RoutineEditorPage() {
  const { profile } = useAuth()
  const { routineId } = useParams<{ routineId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = routineId === 'nova'
  const isTrainer = profile?.role === 'trainer'
  const existing = useRoutine(isNew ? null : (routineId ?? null))
  const trainerId = profile?.id ?? ''
  const [draft, setDraft] = useState<RoutineDraft | null>(
    isNew
      ? emptyRoutine(isTrainer ? searchParams.get('aluno') : (profile?.id ?? null))
      : null,
  )
  // Seletor aberto para adicionar ou para substituir um exercício (id do bloco).
  const [picker, setPicker] = useState<
    { mode: 'add' } | { mode: 'replace'; id: string } | null
  >(null)
  const [formError, setFormError] = useState('')
  const save = useSaveRoutine()

  const students = useQuery({
    queryKey: ['routines', 'students', trainerId],
    enabled: Boolean(trainerId) && isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'student_id, profiles!trainer_student_relationships_student_id_fkey(full_name)',
        )
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
  })

  // Ficha existente: o rascunho nasce dos dados carregados, sem efeito.
  const loadedDraft =
    !draft && existing.data ? toDraft(existing.data, existing.data.trainer_id) : null
  if (loadedDraft) setDraft(loadedDraft)

  if (!profile) return null
  // Personal e aluno da ficha editam; quem não participa é redirecionado.
  if (
    existing.data &&
    existing.data.trainer_id !== profile.id &&
    existing.data.student_id !== profile.id
  ) {
    return <Navigate to={isTrainer ? '/app/alunos' : '/app/treinos'} replace />
  }
  const backTo = isTrainer
    ? draft?.studentId
      ? `/app/alunos/${draft.studentId}`
      : '/app/alunos'
    : '/app/treinos'

  const update = (patch: Partial<RoutineDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))
  const updateExercise = (id: string, patch: Partial<RoutineExerciseDraft>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : current,
    )
  const moveExercise = (id: string, direction: -1 | 1) =>
    setDraft((current) => {
      if (!current) return current
      const index = current.exercises.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.exercises.length) return current
      const exercises = [...current.exercises]
      const [moved] = exercises.splice(index, 1)
      if (moved) exercises.splice(target, 0, moved)
      return { ...current, exercises }
    })

  const submit = () => {
    if (!draft) return
    setFormError('')
    const result = serializeRoutine(draft)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    save.mutate(result.payload, {
      onSuccess: () => void navigate(backTo, { replace: true }),
      onError: () => setFormError('Não foi possível salvar a ficha. Tente novamente.'),
    })
  }

  if (!isNew && existing.isLoading) {
    return <Shell title="Carregando ficha…" />
  }
  if (!isNew && (existing.error || !existing.data)) {
    return (
      <Shell title="Ficha não encontrada">
        <p className="mt-4 text-sm text-slate-400">
          Ela pode ter sido arquivada.{' '}
          <Link
            className="text-[var(--brand)] underline"
            to={isTrainer ? '/app/alunos' : '/app/treinos'}
          >
            Voltar
          </Link>
        </p>
      </Shell>
    )
  }
  if (!draft) return null

  return (
    <main className="min-h-dvh px-4 pb-32 pt-5 text-white sm:px-7 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
            to={backTo}
          >
            <ArrowLeft size={17} /> Voltar
          </Link>
          <Button disabled={save.isPending} onClick={submit}>
            {save.isPending && <LoaderCircle className="animate-spin" size={17} />}
            Salvar
          </Button>
        </header>

        <section className="mt-5 rounded-[1.5rem] bg-white p-5 text-slate-950">
          <label className="block">
            <span className="sr-only">Nome da ficha</span>
            <input
              className="w-full border-0 bg-transparent text-2xl font-bold tracking-[-0.03em] outline-none placeholder:text-slate-300"
              maxLength={80}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="Nome da ficha"
              value={draft.name}
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {isTrainer && (
              <label className="block text-xs font-semibold text-slate-500">
                Aluno
                <select
                  className="field mt-1"
                  onChange={(event) => update({ studentId: event.target.value || null })}
                  value={draft.studentId ?? ''}
                >
                  <option value="">Modelo (sem aluno)</option>
                  {students.data?.map((item) => (
                    <option key={item.student_id} value={item.student_id}>
                      {item.profiles?.full_name ?? 'Aluno'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-xs font-semibold text-slate-500">
              Observações
              <input
                className="field mt-1"
                maxLength={500}
                onChange={(event) => update({ notes: event.target.value })}
                placeholder="Ex.: 3x por semana"
                value={draft.notes}
              />
            </label>
          </div>
        </section>

        <div className="mt-4 space-y-4">
          {draft.exercises.map((exercise, index) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              isFirst={index === 0}
              isLast={index === draft.exercises.length - 1}
              onChange={(patch) => updateExercise(exercise.id, patch)}
              onMove={(direction) => moveExercise(exercise.id, direction)}
              onReplace={() => setPicker({ mode: 'replace', id: exercise.id })}
              onRemove={() =>
                update({
                  exercises: draft.exercises.filter((item) => item.id !== exercise.id),
                })
              }
            />
          ))}
        </div>

        <Button
          className="mt-4 w-full border-blue-400/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
          onClick={() => setPicker({ mode: 'add' })}
          variant="outline"
        >
          <Plus size={17} /> Adicionar exercício
        </Button>

        {formError && (
          <p
            className="mt-4 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            {formError}
          </p>
        )}

        {picker && (
          <ExercisePicker
            onClose={() => setPicker(null)}
            onPick={(picked) => {
              const name = exerciseDisplayName(picked)
              const media = searchResultMedia(picked)
              if (picker.mode === 'add') {
                update({
                  exercises: [
                    ...draft.exercises,
                    newRoutineExercise({ exerciseId: picked.id, media, name }),
                  ],
                })
              } else {
                // Substituir mantém notas, descanso e séries do bloco.
                updateExercise(picker.id, { exerciseId: picked.id, media, name })
              }
              setPicker(null)
            }}
            ownerId={profile.id}
            title={picker.mode === 'add' ? 'Adicionar exercício' : 'Substituir exercício'}
          />
        )}
      </div>
    </main>
  )
}

function ExerciseBlock({
  exercise,
  isFirst,
  isLast,
  onChange,
  onMove,
  onReplace,
  onRemove,
}: {
  exercise: RoutineExerciseDraft
  isFirst: boolean
  isLast: boolean
  onChange: (patch: Partial<RoutineExerciseDraft>) => void
  onMove: (direction: -1 | 1) => void
  onReplace: () => void
  onRemove: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const updateSet = (id: string, patch: { weightKg?: string; reps?: string }) =>
    onChange({
      sets: exercise.sets.map((set) => (set.id === id ? { ...set, ...patch } : set)),
    })

  return (
    <section className="rounded-[1.5rem] bg-white p-4 text-slate-950 sm:p-5">
      <div className="flex items-center gap-3">
        <ExerciseThumb media={exercise.media} name={exercise.name} />
        <h3 className="min-w-0 flex-1 truncate font-semibold text-[var(--brand)]">
          {exercise.name}
        </h3>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-label={`Opções de ${exercise.name}`}
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-lg">
              <MenuItem
                disabled={isFirst}
                onClick={() => {
                  onMove(-1)
                  setMenuOpen(false)
                }}
              >
                <ArrowUp size={15} /> Mover para cima
              </MenuItem>
              <MenuItem
                disabled={isLast}
                onClick={() => {
                  onMove(1)
                  setMenuOpen(false)
                }}
              >
                <ArrowDown size={15} /> Mover para baixo
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onReplace()
                  setMenuOpen(false)
                }}
              >
                <Repeat size={15} /> Substituir exercício
              </MenuItem>
              <MenuItem danger onClick={onRemove}>
                <Trash2 size={15} /> Remover exercício
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      <input
        aria-label={`Notas de ${exercise.name}`}
        className="mt-3 w-full border-0 border-b border-slate-100 bg-transparent pb-1 text-sm outline-none placeholder:text-slate-400 focus:border-[var(--brand)]"
        maxLength={300}
        onChange={(event) => onChange({ notes: event.target.value })}
        placeholder="Adicionar notas…"
        value={exercise.notes}
      />

      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--brand)]">
        <Timer size={16} />
        <span className="sr-only">Descanso de {exercise.name}</span>
        <select
          className="border-0 bg-transparent font-semibold outline-none"
          onChange={(event) =>
            onChange({
              restSeconds: event.target.value === '' ? null : Number(event.target.value),
            })
          }
          value={exercise.restSeconds ?? ''}
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
            <th className="w-12 pb-1 text-left">Série</th>
            <th className="pb-1 text-left">Kg</th>
            <th className="pb-1 text-left">Reps</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {exercise.sets.map((set, index) => (
            <tr key={set.id} className="border-t border-slate-50">
              <td className="py-1.5 font-semibold text-slate-500">{index + 1}</td>
              <td className="py-1.5 pr-2">
                <input
                  aria-label={`Carga da série ${index + 1} de ${exercise.name}`}
                  className={cn('field h-9 rounded-lg bg-slate-50 px-2 text-center')}
                  inputMode="decimal"
                  onChange={(event) =>
                    updateSet(set.id, { weightKg: event.target.value })
                  }
                  placeholder="—"
                  value={set.weightKg}
                />
              </td>
              <td className="py-1.5 pr-2">
                <input
                  aria-label={`Repetições da série ${index + 1} de ${exercise.name}`}
                  className="field h-9 rounded-lg bg-slate-50 px-2 text-center"
                  inputMode="numeric"
                  onChange={(event) => updateSet(set.id, { reps: event.target.value })}
                  placeholder="—"
                  value={set.reps}
                />
              </td>
              <td className="py-1.5 text-right">
                <button
                  aria-label={`Remover série ${index + 1} de ${exercise.name}`}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() =>
                    onChange({ sets: exercise.sets.filter((item) => item.id !== set.id) })
                  }
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        onClick={() =>
          onChange({ sets: [...exercise.sets, newSet(exercise.sets.at(-1))] })
        }
        type="button"
      >
        + Adicionar série
      </button>
    </section>
  )
}

function MenuItem({
  children,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-40',
        danger && 'text-red-600',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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

function toDraft(routine: RoutineWithExercises, trainerId: string | null): RoutineDraft {
  return {
    id: routine.id,
    name: routine.name,
    notes: routine.notes ?? '',
    studentId: routine.student_id,
    exercises: routine.routine_exercises.map((item) => ({
      id: item.id,
      exerciseId: item.exercise.id,
      media: exerciseMediaFrom(item.exercise, trainerId),
      name: routineExerciseName(item.exercise, trainerId),
      notes: item.notes ?? '',
      restSeconds: item.rest_seconds,
      sets: item.routine_sets.map((set) => ({
        id: set.id,
        weightKg: set.target_weight_kg === null ? '' : String(set.target_weight_kg),
        reps: set.target_reps === null ? '' : String(set.target_reps),
      })),
    })),
  }
}
