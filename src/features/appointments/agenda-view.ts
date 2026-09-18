export type AgendaView = 'day' | 'threeDays' | 'week' | 'month'

export const agendaViewDays: Record<AgendaView, number> = {
  day: 1,
  threeDays: 3,
  week: 7,
  month: 31 | 30 | 28,
}

export function getAgendaDays(anchorDate: Date, view: AgendaView) {
  const firstDay =
    view === 'week' ? startOfWeek(anchorDate) : startOfAgendaDay(anchorDate)
  return Array.from({ length: agendaViewDays[view] }, (_, index) =>
    addAgendaDays(firstDay, index),
  )
}

export function startOfAgendaDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addAgendaDays(value: Date, amount: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

function startOfWeek(value: Date) {
  const date = startOfAgendaDay(value)
  const weekday = date.getDay() || 7
  date.setDate(date.getDate() - weekday + 1)
  return date
}
