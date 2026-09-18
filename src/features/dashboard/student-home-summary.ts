import type { Tables } from '@/lib/supabase/database.types'

type Appointment = Pick<Tables<'appointments'>, 'starts_at' | 'status' | 'package_id'>

export function buildStudentHomeSummary({
  appointments,
  activePackageId,
  balance,
  now = new Date(),
}: {
  appointments: readonly Appointment[]
  activePackageId: string | null
  balance: number
  now?: Date
}) {
  const concluded = appointments.filter(
    (item) => item.status === 'completed' || item.status === 'student_no_show',
  )
  const attended = concluded.filter((item) => item.status === 'completed').length
  const packageUsed = activePackageId
    ? concluded.filter((item) => item.package_id === activePackageId).length
    : 0
  const nextAppointment = appointments
    .filter((item) => item.status === 'scheduled' && new Date(item.starts_at) >= now)
    .sort(
      (left, right) =>
        new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    )[0]

  return {
    balance,
    packageUsed,
    attendance: concluded.length ? Math.round((attended / concluded.length) * 100) : null,
    nextAppointment: nextAppointment?.starts_at ?? null,
  }
}
