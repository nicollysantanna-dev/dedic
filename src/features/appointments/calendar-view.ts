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

/**
 * Dia com check-in vira fundo de dia inteiro. Fica como fundo para não competir
 * com aulas nem bloquear a seleção de horários.
 */
export function checkInBackgroundEvents(days: readonly string[]) {
  return days.map((day) => ({
    id: `check-in-${day}`,
    start: day,
    allDay: true,
    display: 'background' as const,
    classNames: ['dedic-calendar-check-in'],
  }))
}
