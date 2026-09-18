import type { Tables } from '@/lib/supabase/database.types'

export function canMoveAppointment(
  appointment: Pick<Tables<'appointments'>, 'starts_at' | 'status'>,
  now = new Date(),
) {
  const startsAt = new Date(appointment.starts_at)
  return (
    appointment.status === 'scheduled' &&
    startsAt > now &&
    !isSameCalendarDay(startsAt, now)
  )
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}
