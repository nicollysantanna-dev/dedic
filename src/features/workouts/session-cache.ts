import type { WorkoutSession, WorkoutSet } from '@/features/workouts/workout-queries'

export type SetPatch = Partial<
  Pick<WorkoutSet, 'weight_kg' | 'reps' | 'completed_at' | 'set_type'>
>

/**
 * Aplica a alteração de uma série no cache da sessão, sem recarregar o treino
 * inteiro. Blocos e séries não afetados mantêm a mesma referência.
 */
export function applySetPatch(
  session: WorkoutSession,
  setId: string,
  patch: SetPatch,
): WorkoutSession {
  return {
    ...session,
    workout_exercises: session.workout_exercises.map((item) => {
      if (!item.workout_sets.some((set) => set.id === setId)) return item
      return {
        ...item,
        workout_sets: item.workout_sets.map((set) =>
          set.id === setId ? { ...set, ...patch } : set,
        ),
      }
    }),
  }
}
