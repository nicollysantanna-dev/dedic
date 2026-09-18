export type CalendarView =
  'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek' | 'dayGridMonth'

export const calendarViewLabels: Record<CalendarView, string> = {
  timeGridDay: 'Dia',
  timeGridThreeDay: '3 dias',
  timeGridWeek: 'Semana',
  dayGridMonth: 'Mês',
}

export function getInitialCalendarView(isMobile: boolean): CalendarView {
  return isMobile ? 'timeGridDay' : 'timeGridWeek'
}
