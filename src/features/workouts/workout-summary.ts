import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { workoutKeys } from '@/features/workouts/keys'
import { requireSupabase } from '@/lib/supabase/client'

// Espelha o JSON de `workout_summary` (migração 20261011140000).
export const workoutSummarySchema = z.object({
  name: z.string(),
  finished_at: z.string(),
  duration_seconds: z.number(),
  sets: z.number(),
  volume_kg: z.number(),
  week: z.object({ check_ins: z.number(), target: z.number(), met_now: z.boolean() }),
  new_achievements: z.array(z.string()),
  records: z.number(),
  recorded_by_student: z.boolean(),
})

export type WorkoutSummary = z.infer<typeof workoutSummarySchema>

/** Números e conquistas de um treino finalizado, calculados no banco. */
export function useWorkoutSummary(workoutId: string | null) {
  return useQuery({
    queryKey: workoutKeys.summary(workoutId ?? ''),
    enabled: Boolean(workoutId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('workout_summary', {
        target_workout_id: workoutId!,
      })
      if (error) throw error
      return workoutSummarySchema.parse(data)
    },
  })
}
