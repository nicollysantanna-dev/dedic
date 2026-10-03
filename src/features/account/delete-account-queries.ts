import { useMutation, useQuery } from '@tanstack/react-query'

import type { Profile } from '@/features/auth/types'
import { requireSupabase } from '@/lib/supabase/client'

export const deleteAccountKeys = {
  impact: (userId: string) => ['account', 'deletion-impact', userId] as const,
}

export type DeletionImpact = { futureLessons: number; activeStudents: number }

/** Contagens exibidas antes da exclusão; só existem para personal. */
export function useDeletionImpact(profile: Pick<Profile, 'id' | 'role'> | null) {
  const trainerId = profile?.role === 'trainer' ? profile.id : ''
  return useQuery({
    queryKey: deleteAccountKeys.impact(trainerId),
    enabled: Boolean(trainerId),
    queryFn: async (): Promise<DeletionImpact> => {
      const supabase = requireSupabase()
      const [lessons, students] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', trainerId)
          .eq('status', 'scheduled')
          .gt('starts_at', new Date().toISOString()),
        supabase
          .from('trainer_student_relationships')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', trainerId)
          .eq('status', 'active'),
      ])
      if (lessons.error) throw lessons.error
      if (students.error) throw students.error
      return { futureLessons: lessons.count ?? 0, activeStudents: students.count ?? 0 }
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (accessToken: string) => {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const errorCode =
          body && typeof body === 'object' && 'error' in body
            ? String(body.error)
            : 'DELETE_FAILED'
        throw new Error(errorCode)
      }
    },
  })
}
