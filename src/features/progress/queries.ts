import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { progressKeys } from '@/features/progress/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

export const photosBucket = 'progress-photos'
const signedUrlSeconds = 120

export function useProgressEntries(studentId: string) {
  return useQuery({
    queryKey: progressKeys.entries(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('progress_entries')
        .select('*, author:profiles!progress_entries_recorded_by_fkey(full_name)')
        .eq('student_id', studentId)
        .order('recorded_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type GoalWithExercise = Tables<'student_goals'> & {
  exercise: Pick<Tables<'exercises'>, 'id' | 'name_en' | 'name_pt'> | null
}

export function useGoals(studentId: string) {
  return useQuery({
    queryKey: progressKeys.goals(studentId),
    enabled: Boolean(studentId),
    queryFn: async (): Promise<GoalWithExercise[]> => {
      const { data, error } = await requireSupabase()
        .from('student_goals')
        .select('*, exercise:exercises(id, name_en, name_pt)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePhotos(studentId: string) {
  return useQuery({
    queryKey: progressKeys.photos(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('progress_photos')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('taken_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** URL assinada de curta duração; a política do bucket já restringe quem pode gerar. */
export function usePhotoUrl(path: string | null) {
  return useQuery({
    queryKey: progressKeys.photoUrl(path ?? ''),
    enabled: Boolean(path),
    staleTime: (signedUrlSeconds - 15) * 1000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .storage.from(photosBucket)
        .createSignedUrl(path!, signedUrlSeconds)
      if (error) throw error
      return data.signedUrl
    },
  })
}

export function useAddProgressEntry(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      recordedOn: string
      weightKg: number | null
      measurements: Record<string, number>
      note: string
      recordedBy: string
    }) => {
      const { error } = await requireSupabase()
        .from('progress_entries')
        .insert({
          student_id: studentId,
          recorded_on: input.recordedOn,
          weight_kg: input.weightKg,
          measurements: input.measurements,
          note: input.note || null,
          recorded_by: input.recordedBy,
        })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressKeys.all }),
  })
}

export function useCreateGoal(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      trainerId: string
      kind: Tables<'student_goals'>['kind']
      exerciseId?: string | null
      initialValue: number
      targetValue: number
      targetDate: string
    }) => {
      const { error } = await requireSupabase()
        .from('student_goals')
        .insert({
          trainer_id: input.trainerId,
          student_id: studentId,
          kind: input.kind,
          exercise_id: input.exerciseId ?? null,
          initial_value: input.initialValue,
          target_value: input.targetValue,
          target_date: input.targetDate,
          created_by: input.trainerId,
        })
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: progressKeys.goals(studentId) }),
  })
}

export function useUpdateGoalStatus(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      goalId: string
      status: Tables<'student_goals'>['status']
    }) => {
      const { error } = await requireSupabase()
        .from('student_goals')
        .update({ status: input.status })
        .eq('id', input.goalId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: progressKeys.goals(studentId) }),
  })
}

export function useUploadPhoto(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      file: Blob
      takenOn: string
      position: Tables<'progress_photos'>['position']
    }) => {
      const path = `${studentId}/${crypto.randomUUID()}.jpg`
      const storage = requireSupabase().storage.from(photosBucket)
      const upload = await storage.upload(path, input.file, {
        contentType: 'image/jpeg',
        upsert: false,
      })
      if (upload.error) throw upload.error

      const { error } = await requireSupabase().from('progress_photos').insert({
        student_id: studentId,
        taken_on: input.takenOn,
        position: input.position,
        storage_path: path,
      })
      if (error) {
        // Sem metadado a foto seria órfã e invisível: desfaz o upload.
        await storage.remove([path])
        throw error
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: progressKeys.photos(studentId) }),
  })
}

export function useDeletePhoto(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photo: Pick<Tables<'progress_photos'>, 'id' | 'storage_path'>) => {
      const removal = await requireSupabase()
        .storage.from(photosBucket)
        .remove([photo.storage_path])
      if (removal.error) throw removal.error
      const { error } = await requireSupabase().rpc('delete_progress_photo', {
        target_photo_id: photo.id,
      })
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: progressKeys.photos(studentId) }),
  })
}
