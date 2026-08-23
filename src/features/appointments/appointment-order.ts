import type { Tables } from '@/lib/supabase/database.types'

type Appointment = Pick<Tables<'appointments'>, 'id' | 'starts_at' | 'status'>

const statusPriority: Record<Appointment['status'], number> = {
  scheduled: 0,
  completed: 1,
  student_no_show: 1,
  cancelled_for_reschedule: 2,
  cancelled_by_student: 3,
  cancelled_by_trainer: 3,
}

export function sortAppointmentsForAgenda<T extends Appointment>(
  appointments: readonly T[],
  now = new Date(),
) {
  const nowTime = now.getTime()

  return [...appointments].sort((left, right) => {
    const leftTime = new Date(left.starts_at).getTime()
    const rightTime = new Date(right.starts_at).getTime()
    const leftIsFuture = leftTime >= nowTime
    const rightIsFuture = rightTime >= nowTime

    if (leftIsFuture !== rightIsFuture) return leftIsFuture ? -1 : 1

    const timeDifference = leftIsFuture ? leftTime - rightTime : rightTime - leftTime
    if (timeDifference !== 0) return timeDifference

    const priorityDifference = statusPriority[left.status] - statusPriority[right.status]
    return priorityDifference || left.id.localeCompare(right.id)
  })
}
