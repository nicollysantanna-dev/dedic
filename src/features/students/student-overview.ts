import {
  buildStudentAlerts,
  type ActivitySummary,
  type StudentAlert,
} from '@/features/students/student-alerts'
import type { Tables } from '@/lib/supabase/database.types'

export type StudentOverview = {
  relationshipId: string
  studentId: string
  name: string
  phone: string | null
  balance: number
  attendance: number | null
  nextAppointment: string | null
  renewalDate: string | null
  paymentStatus: Tables<'payments'>['status'] | null
  alerts: StudentAlert[]
  needsAttention: boolean
}

/** Converte uma linha da vista `student_activity_summary` no modelo das telas. */
export function toStudentOverview(
  summary: ActivitySummary,
  now = new Date(),
): StudentOverview {
  const alerts = buildStudentAlerts(summary, now)
  const overdue = (summary.overdue_payments ?? 0) > 0
  const pending = (summary.pending_payments ?? 0) > 0
  return {
    relationshipId: summary.relationship_id ?? '',
    studentId: summary.student_id ?? '',
    name: summary.full_name ?? 'Aluno',
    phone: summary.phone ?? null,
    balance: summary.balance ?? 0,
    attendance: summary.attendance_rate ?? null,
    nextAppointment: summary.next_appointment_at ?? null,
    renewalDate: summary.next_renewal_on ?? null,
    paymentStatus: overdue ? 'overdue' : pending ? 'pending' : null,
    alerts,
    needsAttention: alerts.length > 0,
  }
}

export function buildStudentOverviews(
  summaries: readonly ActivitySummary[],
  now = new Date(),
) {
  return summaries
    .map((summary) => toStudentOverview(summary, now))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}
