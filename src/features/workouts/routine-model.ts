import type { ExerciseMedia } from '@/features/workouts/exercise-media'
import type { Json } from '@/lib/supabase/database.types'

/** Modelo do editor de ficha (estilo Hevy): exercícios em ordem com séries-alvo individuais. */

export type RoutineSetDraft = { id: string; weightKg: string; reps: string }

export type RoutineExerciseDraft = {
  id: string
  exerciseId: string
  media: ExerciseMedia
  name: string
  notes: string
  restSeconds: number | null
  sets: RoutineSetDraft[]
}

export type RoutineDraft = {
  id: string | null
  name: string
  notes: string
  studentId: string | null
  exercises: RoutineExerciseDraft[]
}

export const restOptions = [
  { value: null, label: 'Sem descanso' },
  { value: 30, label: '30 s' },
  { value: 45, label: '45 s' },
  { value: 60, label: '1 min' },
  { value: 90, label: '1 min 30 s' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
]

export function newSet(previous?: RoutineSetDraft): RoutineSetDraft {
  return {
    id: crypto.randomUUID(),
    weightKg: previous?.weightKg ?? '',
    reps: previous?.reps ?? '',
  }
}

export function newRoutineExercise(input: {
  exerciseId: string
  media: ExerciseMedia
  name: string
}): RoutineExerciseDraft {
  return {
    id: crypto.randomUUID(),
    exerciseId: input.exerciseId,
    media: input.media,
    name: input.name,
    notes: '',
    restSeconds: 90,
    sets: [newSet(), newSet(), newSet()],
  }
}

export function emptyRoutine(studentId: string | null): RoutineDraft {
  return { id: null, name: '', notes: '', studentId, exercises: [] }
}

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'))
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed
}

/** Valida o rascunho e devolve o JSON esperado por `save_routine`, ou a primeira mensagem de erro. */
export function serializeRoutine(
  draft: RoutineDraft,
): { ok: true; payload: Json } | { ok: false; error: string } {
  if (draft.name.trim().length < 2) return { ok: false, error: 'Dê um nome à ficha.' }
  if (draft.exercises.length === 0)
    return { ok: false, error: 'Adicione pelo menos um exercício.' }
  for (const exercise of draft.exercises) {
    if (exercise.sets.length === 0) {
      return { ok: false, error: `${exercise.name}: adicione pelo menos uma série.` }
    }
    for (const set of exercise.sets) {
      const weight = parseNumber(set.weightKg)
      const reps = parseNumber(set.reps)
      if (set.weightKg.trim() !== '' && (weight === null || weight < 0 || weight > 999)) {
        return { ok: false, error: `${exercise.name}: carga inválida.` }
      }
      if (
        set.reps.trim() !== '' &&
        (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 200)
      ) {
        return { ok: false, error: `${exercise.name}: repetições inválidas.` }
      }
    }
  }
  return {
    ok: true,
    payload: {
      id: draft.id,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
      student_id: draft.studentId,
      exercises: draft.exercises.map((exercise) => ({
        exercise_id: exercise.exerciseId,
        notes: exercise.notes.trim(),
        rest_seconds: exercise.restSeconds,
        sets: exercise.sets.map((set) => ({
          weight_kg: parseNumber(set.weightKg),
          reps: parseNumber(set.reps),
        })),
      })),
    },
  }
}

export function formatRest(seconds: number | null) {
  if (seconds === null) return 'Sem descanso'
  return restOptions.find((option) => option.value === seconds)?.label ?? `${seconds} s`
}
