import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  exercisePhotosBucket,
  type ExerciseMedia,
} from '@/features/workouts/exercise-media'
import { workoutKeys } from '@/features/workouts/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type RawSearchResult =
  Database['public']['Functions']['search_exercises']['Returns'][number]

/** O tipo gerado perde a nulabilidade das colunas da função; aqui ela é explícita. */
export type ExerciseSearchResult = Omit<
  RawSearchResult,
  'alias' | 'name_pt' | 'external_id' | 'photo_path'
> & {
  alias: string | null
  name_pt: string | null
  external_id: string | null
  photo_path: string | null
}

export { exercisePhotoUrl } from '@/features/workouts/exercise-media'

/** Nome exibido: apelido do personal > tradução > nome original. */
export function exerciseDisplayName(
  exercise: Pick<ExerciseSearchResult, 'alias' | 'name_pt' | 'name_en'>,
) {
  return exercise.alias ?? exercise.name_pt ?? exercise.name_en
}

export function searchResultMedia(
  exercise: Pick<ExerciseSearchResult, 'image_paths' | 'photo_path' | 'instructions'>,
): ExerciseMedia {
  return {
    images: exercise.image_paths,
    photoPath: exercise.photo_path,
    instructions: exercise.instructions,
  }
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

async function uploadPhoto(ownerId: string, label: string, file: Blob) {
  const path = `${ownerId}/${label}-${Date.now()}.jpg`
  const { error } = await requireSupabase()
    .storage.from(exercisePhotosBucket)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

const removePhotos = (paths: string[]) =>
  requireSupabase().storage.from(exercisePhotosBucket).remove(paths)

export function useSaveExercisePhoto(trainerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      exerciseId: string
      file: Blob
      previousPath: string | null
    }) => {
      const path = await uploadPhoto(trainerId, input.exerciseId, input.file)
      const { error } = await requireSupabase().from('exercise_aliases').upsert({
        trainer_id: trainerId,
        exercise_id: input.exerciseId,
        photo_path: path,
      })
      if (error) {
        await removePhotos([path])
        throw error
      }
      if (input.previousPath) await removePhotos([input.previousPath])
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}

export function useRemoveExercisePhoto(trainerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      exerciseId: string
      path: string
      alias: string | null
    }) => {
      await removePhotos([input.path])
      const table = requireSupabase().from('exercise_aliases')
      const { error } = input.alias
        ? await table
            .update({ photo_path: null })
            .eq('trainer_id', trainerId)
            .eq('exercise_id', input.exerciseId)
        : await table
            .delete()
            .eq('trainer_id', trainerId)
            .eq('exercise_id', input.exerciseId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}

export function useSaveExerciseAlias(trainerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      exerciseId: string
      alias: string
      hasPhoto: boolean
    }) => {
      const alias = input.alias.trim()
      const table = requireSupabase().from('exercise_aliases')
      if (!alias) {
        // Sem apelido: mantém a linha se houver foto, senão remove.
        const { error } = input.hasPhoto
          ? await table
              .update({ alias: null })
              .eq('trainer_id', trainerId)
              .eq('exercise_id', input.exerciseId)
          : await table
              .delete()
              .eq('trainer_id', trainerId)
              .eq('exercise_id', input.exerciseId)
        if (error) throw error
        return
      }
      const { error } = await table.upsert({
        trainer_id: trainerId,
        exercise_id: input.exerciseId,
        alias,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}

/**
 * Exercício próprio (aluno ou personal), com foto opcional do aparelho.
 * Devolve a linha no formato da busca para entrar direto na ficha/sessão.
 */
export function useCreateCustomExercise(ownerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      bodyParts: string[]
      equipments: string[]
      targetMuscles: string[]
      photo?: Blob | null
    }): Promise<ExerciseSearchResult> => {
      const photoPath = input.photo
        ? await uploadPhoto(ownerId, 'custom', input.photo)
        : null
      const { data, error } = await requireSupabase()
        .from('exercises')
        .insert({
          source: 'custom',
          owner_id: ownerId,
          name_en: input.name,
          name_pt: input.name,
          body_parts: input.bodyParts,
          equipments: input.equipments,
          target_muscles: input.targetMuscles,
          photo_path: photoPath,
        })
        .select(
          'id, source, external_id, name_en, name_pt, photo_path, image_paths, instructions, body_parts, equipments, target_muscles, secondary_muscles',
        )
        .single()
      if (error) {
        if (photoPath) await removePhotos([photoPath])
        throw error
      }
      return { ...data, alias: null }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  })
}
