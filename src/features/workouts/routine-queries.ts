import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { routineKeys } from '@/features/workouts/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Json, Tables } from '@/lib/supabase/database.types'

const routineSelect = `
  *,
  student:profiles!routines_student_id_fkey(full_name),
  routine_exercises(
    id, position, notes, rest_seconds,
    exercise:exercises(id, external_id, name_en, name_pt, source, body_parts, equipments, target_muscles,
      aliases:exercise_aliases(alias, trainer_id, photo_path)),
    routine_sets(id, position, target_weight_kg, target_reps)
  )
`

export type RoutineWithExercises = Tables<'routines'> & {
  student: { full_name: string } | null
  routine_exercises: (Pick<
    Tables<'routine_exercises'>,
    'id' | 'position' | 'notes' | 'rest_seconds'
  > & {
    exercise: Pick<
      Tables<'exercises'>,
      | 'id'
      | 'external_id'
      | 'name_en'
      | 'name_pt'
      | 'source'
      | 'body_parts'
      | 'equipments'
      | 'target_muscles'
    > & {
      aliases: Pick<Tables<'exercise_aliases'>, 'alias' | 'trainer_id' | 'photo_path'>[]
    }
    routine_sets: Pick<
      Tables<'routine_sets'>,
      'id' | 'position' | 'target_weight_kg' | 'target_reps'
    >[]
  })[]
}

function sortRoutine(routine: RoutineWithExercises): RoutineWithExercises {
  return {
    ...routine,
    routine_exercises: [...routine.routine_exercises]
      .sort((left, right) => left.position - right.position)
      .map((item) => ({
        ...item,
        routine_sets: [...item.routine_sets].sort(
          (left, right) => left.position - right.position,
        ),
      })),
  }
}

/** Nome do exercício dentro de uma ficha: apelido do personal dono > PT > EN. */
export function routineExerciseName(
  exercise: RoutineWithExercises['routine_exercises'][number]['exercise'],
  trainerId: string | null,
) {
  const alias = trainerId
    ? exercise.aliases.find((item) => item.trainer_id === trainerId)?.alias
    : undefined
  return alias ?? exercise.name_pt ?? exercise.name_en
}

/** Foto do aparelho cadastrada pelo personal da ficha/sessão. */
export function exercisePhotoPath(
  exercise: { aliases: Pick<Tables<'exercise_aliases'>, 'trainer_id' | 'photo_path'>[] },
  trainerId: string | null,
) {
  if (!trainerId) return null
  return (
    exercise.aliases.find((item) => item.trainer_id === trainerId)?.photo_path ?? null
  )
}

export function useTrainerRoutines(trainerId: string, studentId?: string) {
  return useQuery({
    queryKey: studentId ? routineKeys.forStudent(studentId) : routineKeys.mine(trainerId),
    enabled: Boolean(trainerId),
    queryFn: async () => {
      let query = requireSupabase()
        .from('routines')
        .select(routineSelect)
        .eq('trainer_id', trainerId)
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
      if (studentId) query = query.eq('student_id', studentId)
      const { data, error } = await query
      if (error) throw error
      return data.map((routine) => sortRoutine(routine as RoutineWithExercises))
    },
  })
}

export function useStudentRoutines(studentId: string) {
  return useQuery({
    queryKey: routineKeys.forStudent(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('routines')
        .select(routineSelect)
        .eq('student_id', studentId)
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data.map((routine) => sortRoutine(routine as RoutineWithExercises))
    },
  })
}

export function useRoutine(routineId: string | null) {
  return useQuery({
    queryKey: routineKeys.detail(routineId ?? ''),
    enabled: Boolean(routineId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('routines')
        .select(routineSelect)
        .eq('id', routineId!)
        .maybeSingle()
      if (error) throw error
      return data ? sortRoutine(data) : null
    },
  })
}

export function useSaveRoutine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Json) => {
      const { data, error } = await requireSupabase().rpc('save_routine', {
        routine: payload,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  })
}

export function useArchiveRoutine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await requireSupabase().rpc('archive_routine', {
        target_routine_id: routineId,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  })
}

export function useDuplicateRoutine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { routineId: string; studentId: string | null }) => {
      const { data, error } = await requireSupabase().rpc('duplicate_routine', {
        target_routine_id: input.routineId,
        target_student_id: input.studentId ?? undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  })
}
