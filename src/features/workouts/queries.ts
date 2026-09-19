import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getExerciseDetail } from '@/features/workouts/exercisedb-client'
import { workoutKeys } from '@/features/workouts/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type RawSearchResult =
  Database['public']['Functions']['search_exercises']['Returns'][number]

/** O tipo gerado perde a nulabilidade das colunas da função; aqui ela é explícita. */
export type ExerciseSearchResult = Omit<
  RawSearchResult,
  'alias' | 'name_pt' | 'external_id'
> & {
  alias: string | null
  name_pt: string | null
  external_id: string | null
}

/** Nome exibido: apelido do personal > tradução > nome original. */
export function exerciseDisplayName(
  exercise: Pick<ExerciseSearchResult, 'alias' | 'name_pt' | 'name_en'>,
) {
  return exercise.alias ?? exercise.name_pt ?? exercise.name_en
}

export function useExerciseSearch(input: {
  term: string
  bodyPart: string | null
  equipment: string | null
  enabled?: boolean
}): ReturnType<typeof useQuery<ExerciseSearchResult[]>> {
  const term = input.term.trim()
  return useQuery({
    queryKey: workoutKeys.exerciseSearch(term, input.bodyPart, input.equipment),
    enabled: input.enabled ?? true,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('search_exercises', {
        search_term: term,
        body_part: input.bodyPart ?? undefined,
        equipment: input.equipment ?? undefined,
        result_limit: 60,
      })
      if (error) throw error
      return data
    },
  })
}

/** GIF e instruções ao vivo; cache abaixo de uma semana por causa da rotação das URLs. */
export function useExerciseDetail(externalId: string | null) {
  return useQuery({
    queryKey: workoutKeys.exerciseDetail(externalId ?? ''),
    enabled: Boolean(externalId),
    staleTime: 6 * 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: () => getExerciseDetail(externalId!),
  })
}

export function useSaveExerciseAlias(trainerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { exerciseId: string; alias: string }) => {
      const alias = input.alias.trim()
      if (!alias) {
        const { error } = await requireSupabase()
          .from('exercise_aliases')
          .delete()
          .eq('trainer_id', trainerId)
          .eq('exercise_id', input.exerciseId)
        if (error) throw error
        return
      }
      const { error } = await requireSupabase()
        .from('exercise_aliases')
        .upsert({ trainer_id: trainerId, exercise_id: input.exerciseId, alias })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}

export function useCreateCustomExercise(trainerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      bodyParts: string[]
      equipments: string[]
      targetMuscles: string[]
    }) => {
      const { error } = await requireSupabase().from('exercises').insert({
        source: 'custom',
        owner_trainer_id: trainerId,
        name_en: input.name,
        name_pt: input.name,
        body_parts: input.bodyParts,
        equipments: input.equipments,
        target_muscles: input.targetMuscles,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}
