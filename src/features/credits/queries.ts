import { useQuery } from '@tanstack/react-query'

import { creditKeys } from '@/features/credits/keys'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

export const transactionTypeLabels: Record<
  Tables<'credit_transactions'>['transaction_type'],
  string
> = {
  package_activation: 'Ativação do pacote',
  package_cancellation: 'Cancelamento do pacote',
  appointment_consumption: 'Consumo por aula',
  cancellation_refund: 'Devolução por cancelamento',
  manual_adjustment: 'Ajuste manual',
}

/** Saldo derivado do extrato, calculado no banco. */
export function useCreditBalance(studentId: string) {
  return useQuery({
    queryKey: creditKeys.balance(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: studentId,
      })
      if (error) throw error
      return data
    },
  })
}

export function useCreditLedger(studentId: string) {
  return useQuery({
    queryKey: creditKeys.ledger(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('credit_transactions')
        .select(
          '*, author:profiles!credit_transactions_created_by_fkey(full_name), package:lesson_packages(lesson_count, status)',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useStudentPackages(studentId: string) {
  return useQuery({
    queryKey: creditKeys.packages(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('lesson_packages')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Personal com vínculo ativo; só os pacotes dele contam como utilizáveis. */
export function useActiveTrainerId(studentId: string) {
  return useQuery({
    queryKey: creditKeys.activeTrainer(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select('trainer_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data?.trainer_id ?? null
    },
  })
}
