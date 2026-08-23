import type { Database } from '@/lib/supabase/database.types'

export type AppointmentStatus = Database['public']['Enums']['appointment_status']
export type AppointmentOutcome = Extract<
  AppointmentStatus,
  'completed' | 'student_no_show'
>

export function canCompleteAppointment(
  status: AppointmentStatus,
  startsAt: string,
  now = new Date(),
) {
  return status === 'scheduled' && new Date(startsAt) <= now
}

export function getAppointmentStatusLabel(status: AppointmentStatus) {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: 'Agendada',
    completed: 'Realizada',
    cancelled_by_student: 'Cancelada pelo aluno',
    cancelled_by_trainer: 'Cancelada pelo personal',
    cancelled_for_reschedule: 'Remarcada',
    student_no_show: 'Falta do aluno',
  }

  return labels[status]
}

export function getAppointmentStatusTone(status: AppointmentStatus) {
  if (status === 'cancelled_for_reschedule') return 'rescheduled'
  if (status === 'cancelled_by_student' || status === 'cancelled_by_trainer') {
    return 'cancelled'
  }
  if (status === 'student_no_show') return 'attention'
  return 'positive'
}
