import { useQuery } from '@tanstack/react-query'

import { appointmentKeys } from '@/features/appointments/keys'
import { requireSupabase } from '@/lib/supabase/client'

/** Linha da vista `student_activity_summary` para um aluno (visível ao próprio aluno e ao personal). */
export function useActivitySummary(studentId: string) {
  return useQuery({
    queryKey: appointmentKeys.activity(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('student_activity_summary')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
