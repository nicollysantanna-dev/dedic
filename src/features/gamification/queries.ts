import { useQuery } from '@tanstack/react-query'

import { monthlyReportSchema } from '@/features/gamification/schemas'
import { gamificationKeys } from '@/features/gamification/keys'
import { requireSupabase } from '@/lib/supabase/client'

/** Relatório de um mês ("AAAA-MM"). O banco recusa quem não pode ler o aluno. */
export function useMonthlyReport(studentId: string, month: string) {
  return useQuery({
    queryKey: gamificationKeys.report(studentId, month),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('monthly_report', {
        target_student_id: studentId,
        report_month: `${month}-01`,
      })
      if (error) throw error
      return monthlyReportSchema.parse(data)
    },
  })
}

/** Dia do primeiro check-in do aluno, para montar o seletor de meses. */
export function useFirstCheckInDay(studentId: string) {
  return useQuery({
    queryKey: gamificationKeys.firstCheckInDay(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('student_check_ins')
        .select('day')
        .eq('student_id', studentId)
        .order('day', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.day ?? null
    },
  })
}
