import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { getAppointmentStatusLabel } from '@/features/appointments/appointment-status'
import { canMoveAppointment } from '@/features/appointments/appointment-drag'
import { isSelectionWithinAvailableSlots } from '@/features/appointments/available-slot-selection'
import {
  calendarViewLabels,
  getInitialCalendarView,
  type CalendarView,
} from '@/features/appointments/calendar-view'
import type { Tables } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

type CalendarAppointment = Pick<
  Tables<'appointments'>,
  'id' | 'starts_at' | 'ends_at' | 'status'
> & { profiles?: { full_name: string } | null }

type CalendarSlot = { slot_start: string; slot_end: string }
type CalendarBlock = Pick<
  Tables<'availability_exceptions'>,
  'id' | 'starts_at' | 'ends_at'
>

export function InteractiveAgendaCalendar({
  appointments,
  availableSlots = [],
  blockedPeriods = [],
  canCreate = false,
  restrictCreationToAvailableSlots = false,
  lessonDurationMinutes = 60,
  onCreate,
  onAppointmentClick,
  onAppointmentMove,
  onRangeChange,
}: {
  appointments: readonly CalendarAppointment[]
  availableSlots?: readonly CalendarSlot[]
  blockedPeriods?: readonly CalendarBlock[]
  canCreate?: boolean
  restrictCreationToAvailableSlots?: boolean
  lessonDurationMinutes?: number
  onCreate: (startsAt: Date, endsAt: Date) => void
  onAppointmentClick: (appointmentId: string) => void
  onAppointmentMove: (appointmentId: string, startsAt: Date, revert: () => void) => void
  onRangeChange: (startsAt: Date, endsAt: Date) => void
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [view, setView] = useState<CalendarView>(() =>
    getInitialCalendarView(window.matchMedia('(max-width: 767px)').matches),
  )

  const events = useMemo<EventInput[]>(
    () => [
      ...(view === 'dayGridMonth' ? [] : availableSlots).map((slot) => ({
        id: `availability-${slot.slot_start}`,
        start: slot.slot_start,
        end: slot.slot_end,
        display: 'background',
        classNames: ['dedic-calendar-availability'],
      })),
      ...(view === 'dayGridMonth' ? [] : blockedPeriods).map((block) => ({
        id: `block-${block.id}`,
        start: block.starts_at,
        end: block.ends_at,
        display: 'background',
        classNames: ['dedic-calendar-block'],
      })),
      ...appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.profiles?.full_name ?? 'Aula',
        start: appointment.starts_at,
        end: appointment.ends_at,
        editable: canCreate && canMoveAppointment(appointment),
        durationEditable: false,
        classNames: [`dedic-calendar-event--${appointment.status}`],
        extendedProps: { status: appointment.status },
      })),
    ],
    [appointments, availableSlots, blockedPeriods, canCreate, view],
  )

  const isAvailableSelection = (startsAt: Date, endsAt: Date) =>
    !restrictCreationToAvailableSlots ||
    isSelectionWithinAvailableSlots(startsAt, endsAt, availableSlots)

  const selectDate = (startsAt: Date, endsAt?: Date) => {
    const resolvedEnd =
      endsAt ?? new Date(startsAt.getTime() + lessonDurationMinutes * 60_000)
    if (
      !canCreate ||
      startsAt <= new Date() ||
      !isAvailableSelection(startsAt, resolvedEnd)
    )
      return
    onCreate(startsAt, resolvedEnd)
    calendarRef.current?.getApi().unselect()
  }

  const handleDatesSet = (info: DatesSetArg) => {
    setTitle(info.view.title)
    setView(info.view.type as CalendarView)
    onRangeChange(info.start, info.end)
  }

  return (
    <section className="dedic-scheduler overflow-hidden rounded-[1.5rem] bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarControl
            label="Período anterior"
            onClick={() => calendarRef.current?.getApi().prev()}
          >
            <ChevronLeft size={18} />
          </CalendarControl>
          <button
            className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold transition hover:bg-slate-50"
            onClick={() => calendarRef.current?.getApi().today()}
            type="button"
          >
            Hoje
          </button>
          <CalendarControl
            label="Próximo período"
            onClick={() => calendarRef.current?.getApi().next()}
          >
            <ChevronRight size={18} />
          </CalendarControl>
          <h2 className="ml-1 text-sm font-bold capitalize sm:text-base">{title}</h2>
        </div>

        <div className="grid grid-cols-4 rounded-xl bg-slate-100 p-1">
          {(Object.keys(calendarViewLabels) as CalendarView[]).map((option) => (
            <button
              aria-pressed={view === option}
              className={cn(
                'min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-500 transition',
                view === option && 'bg-[var(--brand)] text-white shadow-sm',
              )}
              key={option}
              onClick={() => calendarRef.current?.getApi().changeView(option)}
              type="button"
            >
              {calendarViewLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <FullCalendar
        allDaySlot={false}
        businessHours={false}
        customButtons={{}}
        datesSet={handleDatesSet}
        dateClick={(info: DateClickArg) => {
          if (view === 'dayGridMonth') {
            calendarRef.current?.getApi().changeView('timeGridDay', info.date)
            return
          }
          selectDate(info.date)
        }}
        editable={canCreate}
        eventAllow={(dropInfo) =>
          // A remarcação no banco exige um horário publicado, para qualquer papel.
          dropInfo.start > new Date() &&
          isSelectionWithinAvailableSlots(dropInfo.start, dropInfo.end, availableSlots)
        }
        eventClick={(info: EventClickArg) => onAppointmentClick(info.event.id)}
        eventContent={renderEventContent}
        eventDrop={(info: EventDropArg) => {
          if (!info.event.start) return info.revert()
          onAppointmentMove(info.event.id, info.event.start, info.revert)
        }}
        eventDurationEditable={false}
        eventOverlap={false}
        events={events}
        expandRows
        headerToolbar={false}
        height="auto"
        initialView={view}
        locale={ptBrLocale}
        longPressDelay={550}
        nowIndicator
        dayMaxEvents={3}
        moreLinkText={(number) => `+${number} aulas`}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        ref={calendarRef}
        select={(info: DateSelectArg) => selectDate(info.start, info.end)}
        selectAllow={(info) =>
          canCreate &&
          info.start > new Date() &&
          isAvailableSelection(info.start, info.end)
        }
        selectable={canCreate && view !== 'dayGridMonth'}
        selectMirror
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotMaxTime="22:00:00"
        slotMinTime="06:00:00"
        views={{
          timeGrid: {
            dayHeaderFormat: { weekday: 'short', day: '2-digit' },
          },
          timeGridThreeDay: {
            type: 'timeGrid',
            duration: { days: 3 },
          },
          dayGridMonth: {
            dayHeaderFormat: { weekday: 'short' },
          },
        }}
      />
    </section>
  )
}

function CalendarControl({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="grid size-10 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function renderEventContent(info: EventContentArg) {
  const status = info.event.extendedProps.status as Tables<'appointments'>['status']
  return (
    <div className="min-w-0 px-1 py-0.5">
      <strong className="block truncate text-[0.72rem]">{info.event.title}</strong>
      <span className="block truncate text-[0.62rem] opacity-75">
        {info.timeText} · {getAppointmentStatusLabel(status)}
      </span>
    </div>
  )
}
