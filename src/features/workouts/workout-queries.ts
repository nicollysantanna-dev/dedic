import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { appointmentKeys } from '@/features/appointments/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

export const workoutSessionKeys = {
  all: ['workout-sessions'] as const,
  detail: (workoutId: string) => ['workout-sessions', 'detail', workoutId] as const,
  open: (studentId: string) => ['workout-sessions', 'open', studentId] as const,
  history: (studentId: string) => ['workout-sessions', 'history', studentId] as const,
}

const workoutSelect = `
  *,
  workout_exercises(
    id, position, notes, rest_seconds,
    exercise:exercises(id, external_id, name_en, name_pt, source,
      aliases:exercise_aliases(alias, trainer_id)),
    workout_sets(id, position, set_type, weight_kg, reps, previous_weight_kg, previous_reps, completed_at)
  )
`

export type WorkoutSet = Pick<
  Tables<'workout_sets'>,
  | 'id'
  | 'position'
  | 'set_type'
  | 'weight_kg'
  | 'reps'
  | 'previous_weight_kg'
  | 'previous_reps'
  | 'completed_at'
>
export type WorkoutExercise = Pick<
  Tables<'workout_exercises'>,
  'id' | 'position' | 'notes' | 'rest_seconds'
> & {
  exercise: Pick<
    Tables<'exercises'>,
    'id' | 'external_id' | 'name_en' | 'name_pt' | 'source'
  > & {
    aliases: Pick<Tables<'exercise_aliases'>, 'alias' | 'trainer_id'>[]
  }
  workout_sets: WorkoutSet[]
}
export type WorkoutSession = Tables<'workouts'> & { workout_exercises: WorkoutExercise[] }

function sortSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    workout_exercises: [...session.workout_exercises]
      .sort((left, right) => left.position - right.position)
      .map((item) => ({
        ...item,
        workout_sets: [...item.workout_sets].sort(
          (left, right) => left.position - right.position,
        ),
      })),
  }
}

export function workoutExerciseName(
  exercise: WorkoutExercise['exercise'],
  trainerId: string | null,
) {
  const alias = trainerId
    ? exercise.aliases.find((item) => item.trainer_id === trainerId)?.alias
    : undefined
  return alias ?? exercise.name_pt ?? exercise.name_en
}

export function useWorkoutSession(workoutId: string | null) {
  return useQuery({
    queryKey: workoutSessionKeys.detail(workoutId ?? ''),
    enabled: Boolean(workoutId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('workouts')
        .select(workoutSelect)
        .eq('id', workoutId!)
        .maybeSingle()
      if (error) throw error
      return data ? sortSession(data) : null
    },
  })
}

/** Sessão aberta do aluno (no máximo uma). */
export function useOpenWorkout(studentId: string) {
  return useQuery({
    queryKey: workoutSessionKeys.open(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('workouts')
        .select('id, name, started_at, routine_id, appointment_id')
        .eq('student_id', studentId)
        .is('finished_at', null)
        .is('discarded_at', null)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useStartWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      routineId?: string | null
      appointmentId?: string | null
      studentId?: string | null
      name?: string | null
    }) => {
      const { data, error } = await requireSupabase().rpc('start_workout', {
        target_routine_id: input.routineId ?? undefined,
        target_appointment_id: input.appointmentId ?? undefined,
        target_student_id: input.studentId ?? undefined,
        workout_name: input.name ?? undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all }),
  })
}

function useSessionMutation<TInput>(
  workoutId: string,
  mutationFn: (input: TInput) => Promise<void>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: workoutSessionKeys.detail(workoutId) }),
  })
}

export function useUpdateSet(workoutId: string) {
  return useSessionMutation(
    workoutId,
    async (input: {
      setId: string
      patch: Partial<
        Pick<Tables<'workout_sets'>, 'weight_kg' | 'reps' | 'completed_at' | 'set_type'>
      >
    }) => {
      const { error } = await requireSupabase()
        .from('workout_sets')
        .update(input.patch)
        .eq('id', input.setId)
      if (error) throw error
    },
  )
}

export function useAddSet(workoutId: string) {
  return useSessionMutation(
    workoutId,
    async (input: {
      workoutExerciseId: string
      position: number
      weightKg: number | null
      reps: number | null
    }) => {
      const { error } = await requireSupabase().from('workout_sets').insert({
        workout_exercise_id: input.workoutExerciseId,
        position: input.position,
        weight_kg: input.weightKg,
        reps: input.reps,
      })
      if (error) throw error
    },
  )
}

export function useRemoveSet(workoutId: string) {
  return useSessionMutation(workoutId, async (setId: string) => {
    const { error } = await requireSupabase()
      .from('workout_sets')
      .delete()
      .eq('id', setId)
    if (error) throw error
  })
}

export function useUpdateWorkoutExercise(workoutId: string) {
  return useSessionMutation(
    workoutId,
    async (input: {
      id: string
      patch: Partial<Pick<Tables<'workout_exercises'>, 'notes' | 'rest_seconds'>>
    }) => {
      const { error } = await requireSupabase()
        .from('workout_exercises')
        .update(input.patch)
        .eq('id', input.id)
      if (error) throw error
    },
  )
}

export function useAddWorkoutExercise(workoutId: string) {
  return useSessionMutation(workoutId, async (exerciseId: string) => {
    const { error } = await requireSupabase().rpc('add_workout_exercise', {
      target_workout_id: workoutId,
      target_exercise_id: exerciseId,
    })
    if (error) throw error
  })
}

export function useRemoveWorkoutExercise(workoutId: string) {
  return useSessionMutation(workoutId, async (workoutExerciseId: string) => {
    const { error } = await requireSupabase()
      .from('workout_exercises')
      .delete()
      .eq('id', workoutExerciseId)
    if (error) throw error
  })
}

export function useFinishWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { workoutId: string; notes: string }) => {
      const { data, error } = await requireSupabase().rpc('finish_workout', {
        target_workout_id: input.workoutId,
        workout_notes: input.notes || undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all })
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })
}

export function useDiscardWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await requireSupabase().rpc('discard_workout', {
        target_workout_id: workoutId,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all }),
  })
}
