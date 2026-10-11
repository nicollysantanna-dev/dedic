import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { routineKeys } from '@/features/workouts/keys'
import { applyOrder } from '@/features/workouts/reorder'
import { requireSupabase } from '@/lib/supabase/client'
import type { Json, Tables } from '@/lib/supabase/database.types'

const routineSelect = `
  *,
  student:profiles!routines_student_id_fkey(full_name),
  routine_exercises(
    id, position, notes, rest_seconds,
    exercise:exercises(id, external_id, name_en, name_pt, source, body_parts, equipments, target_muscles,
      photo_path, image_paths, animation_path, instructions, aliases:exercise_aliases(alias, trainer_id, photo_path)),
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
      | 'photo_path'
      | 'image_paths'
      | 'animation_path'
      | 'instructions'
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
        .order('position', { ascending: true })
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
        .order('position', { ascending: true })
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

/**
 * Transforma nome de treino que se repete (2+ vezes, nativo ou importado do
 * Hevy — tanto faz) em ficha, usando a sessão mais recente como molde. Sempre
 * gera só para o próprio usuário autenticado (a função não recebe parâmetro).
 */
export function useGenerateRoutinesFromHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().rpc(
        'generate_routines_from_history',
      )
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  })
}

/** Grava a ordem das fichas de uma lista (personal ou aluno) de uma vez. */
export function useReorderRoutines() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await requireSupabase().rpc('reorder_routines', {
        ordered_ids: orderedIds,
      })
      if (error) throw error
    },
    // Mostra a nova ordem na hora; o servidor confirma em seguida.
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: routineKeys.all })
      queryClient.setQueriesData<RoutineWithExercises[]>(
        { queryKey: routineKeys.all },
        (current) => (Array.isArray(current) ? applyOrder(current, orderedIds) : current),
      )
    },
    // Em caso de falha, volta para a ordem salva no servidor.
    onSettled: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  })
}
