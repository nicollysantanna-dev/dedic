import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { motion } from 'motion/react'

import {
  addAgendaDays,
  agendaViewDays,
  getAgendaDays,
  startOfAgendaDay,
  type AgendaView,
} from '@/features/appointments/agenda-view'
import { getAppointmentStatusLabel } from '@/features/appointments/appointment-status'
import type { Tables } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

type AgendaAppointment = Pick<
  Tables<'appointments'>,
  'id' | 'starts_at' | 'ends_at' | 'status'
> & { profiles?: { full_name: string } | null }

type AgendaSlot = { slot_start: string; slot_end: string }

const viewLabels: Record<AgendaView, string> = {
  day: 'Dia',
  threeDays: '3 dias',
  week: 'Semana',
  month: 'Mês',
}
const startHour = 6
const endHour = 22
const hourHeight = 64

export function AgendaTimeline({
  appointments,
  anchorDate,
  view,
  onAnchorDateChange,
  onViewChange,
  onSelectDay,
  availableSlots = [],
  selectedSlotStart,
  onSelectSlot,
  slotDurationMinutes = 30,
}: {
  appointments: readonly AgendaAppointment[]
  anchorDate: Date
  view: AgendaView
  onAnchorDateChange: (date: Date) => void
  onViewChange: (view: AgendaView) => void
  onSelectDay: (date: Date) => void
  availableSlots?: readonly AgendaSlot[]
  selectedSlotStart?: string | null
  onSelectSlot?: (startsAt: string) => void
  slotDurationMinutes?: number
}) {
  const days = getAgendaDays(anchorDate, view)
  const shift = agendaViewDays[view]

  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2">
          <button
            className="grid size-10 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
            onClick={() => onAnchorDateChange(addAgendaDays(anchorDate, -shift))}
            type="button"
            aria-label="Período anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold transition hover:bg-slate-50"
            onClick={() => onAnchorDateChange(startOfAgendaDay(new Date()))}
            type="button"
          >
            Hoje
          </button>
          <button
            className="grid size-10 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
            onClick={() => onAnchorDateChange(addAgendaDays(anchorDate, shift))}
            type="button"
            aria-label="Próximo período"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="ml-1 text-sm font-bold capitalize sm:text-base">
            {formatPeriod(days)}
          </h2>
        </div>

        <div
          className="grid grid-cols-3 rounded-xl bg-slate-100 p-1"
          aria-label="Visualização da agenda"
        >
          {(Object.keys(viewLabels) as AgendaView[]).map((option) => (
            <button
              className={cn(
                'relative min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-500 transition',
                view === option && 'text-white',
              )}
              key={option}
              onClick={() => onViewChange(option)}
              type="button"
              aria-pressed={view === option}
            >
              {view === option && (
                <motion.span
                  className="absolute inset-0 rounded-lg bg-[var(--brand)]"
                  layoutId="agenda-view"
                />
              )}
              <span className="relative">{viewLabels[option]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="min-w-[44rem]"
          style={{
            minWidth: view === 'month' ? '100%' : view === 'threeDays' ? 640 : 900,
          }}
        >
          <div
            className="sticky top-0 z-20 grid border-b border-slate-100 bg-white"
            style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div />
            {days.map((day) => (
              <button
                className={cn(
                  'border-l border-slate-100 px-2 py-3 text-center transition hover:bg-blue-50',
                  isSameDay(day, new Date()) && 'bg-blue-50/70',
                )}
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                type="button"
              >
                <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day)}
                </span>
                <span
                  className={cn(
                    'mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold',
                    isSameDay(day, new Date()) && 'bg-[var(--brand)] text-white',
                  )}
                >
                  {day.getDate()}
                </span>
              </button>
            ))}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))`,
              height: (endHour - startHour) * hourHeight,
            }}
          >
            <div className="relative">
              {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                <span
                  className="absolute right-3 -translate-y-1/2 text-[0.65rem] font-medium text-slate-400"
                  key={index}
                  style={{ top: index * hourHeight }}
                >
                  {String(startHour + index).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {days.map((day) => (
              <DayColumn
                appointments={appointments.filter((appointment) =>
                  isSameDay(new Date(appointment.starts_at), day),
                )}
                day={day}
                key={day.toISOString()}
                onSelect={() => onSelectDay(day)}
                availableSlots={availableSlots.filter((slot) =>
                  isSameDay(new Date(slot.slot_start), day),
                )}
                selectedSlotStart={selectedSlotStart}
                onSelectSlot={onSelectSlot}
                slotDurationMinutes={slotDurationMinutes}
              />
            ))}
            <div className="pointer-events-none absolute inset-y-0 left-16 right-0">
              {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                <span
                  className="absolute inset-x-0 border-t border-slate-100"
                  key={index}
                  style={{ top: index * hourHeight }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DayColumn({
  day,
  appointments,
  onSelect,
  availableSlots,
  selectedSlotStart,
  onSelectSlot,
  slotDurationMinutes,
}: {
  day: Date
  appointments: readonly AgendaAppointment[]
  onSelect: () => void
  availableSlots: readonly AgendaSlot[]
  selectedSlotStart?: string | null
  onSelectSlot?: (startsAt: string) => void
  slotDurationMinutes: number
}) {
  return (
    <div
      className={cn(
        'relative z-10 border-l border-slate-100',
        isSameDay(day, new Date()) && 'bg-blue-50/25',
      )}
      onDoubleClick={onSelect}
    >
      {onSelectSlot &&
        Array.from({ length: (endHour - startHour) * 2 }, (_, index) => {
          const startsAt = new Date(day)
          startsAt.setHours(startHour + Math.floor(index / 2), (index % 2) * 30, 0, 0)
          const endsAt = new Date(startsAt.getTime() + slotDurationMinutes * 60_000)
          const published = availableSlots.some(
            (slot) => new Date(slot.slot_start).getTime() === startsAt.getTime(),
          )
          const occupied = appointments.some(
            (appointment) =>
              appointment.status === 'scheduled' &&
              new Date(appointment.starts_at) < endsAt &&
              new Date(appointment.ends_at) > startsAt,
          )
          const disabled = startsAt <= new Date() || occupied
          const selected =
            selectedSlotStart &&
            new Date(selectedSlotStart).getTime() === startsAt.getTime()

          return (
            <button
              aria-label={`${published ? 'Horário publicado' : 'Horário livre'}, ${formatTime(startsAt.toISOString())}`}
              className={cn(
                'absolute inset-x-0 z-[1] border-b border-transparent transition hover:bg-blue-100/60 disabled:cursor-not-allowed disabled:bg-slate-100/50',
                published && 'bg-blue-50',
                selected && 'z-[2] border-2 border-blue-600 bg-blue-100',
              )}
              disabled={disabled}
              key={startsAt.toISOString()}
              onClick={() => onSelectSlot(startsAt.toISOString())}
              style={{ top: index * (hourHeight / 2), height: hourHeight / 2 }}
              type="button"
            />
          )
        })}
      {appointments.map((appointment, index) => {
        const start = new Date(appointment.starts_at)
        const end = new Date(appointment.ends_at)
        const startMinutes = start.getHours() * 60 + start.getMinutes()
        const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60_000)
        const top = ((startMinutes - startHour * 60) / 60) * hourHeight
        const height = (durationMinutes / 60) * hourHeight

        return (
          <motion.button
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left shadow-sm transition hover:z-20 hover:brightness-95',
              eventClasses[appointment.status],
            )}
            initial={{ opacity: 0, scale: 0.97 }}
            key={appointment.id}
            onClick={onSelect}
            style={{
              top: Math.max(0, top),
              height: Math.max(34, height),
              zIndex: index + 10,
            }}
            type="button"
            aria-label={`${appointment.profiles?.full_name ?? 'Aula'}, ${getAppointmentStatusLabel(appointment.status)}, ${formatTime(appointment.starts_at)}`}
          >
            <span className="block truncate text-xs font-bold">
              {appointment.profiles?.full_name ?? 'Aula'}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-[0.65rem] opacity-75">
              <Clock3 size={10} /> {formatTime(appointment.starts_at)} ·{' '}
              {getAppointmentStatusLabel(appointment.status)}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

const eventClasses: Record<Tables<'appointments'>['status'], string> = {
  scheduled: 'border-blue-600 bg-blue-100 text-blue-950',
  completed: 'border-emerald-600 bg-emerald-100 text-emerald-950',
  student_no_show: 'border-amber-600 bg-amber-100 text-amber-950',
  cancelled_by_student: 'border-red-500 bg-red-100 text-red-900 line-through opacity-70',
  cancelled_by_trainer: 'border-red-500 bg-red-100 text-red-900 line-through opacity-70',
  cancelled_for_reschedule:
    'border-slate-400 bg-slate-100 text-slate-600 line-through opacity-65',
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatPeriod(days: Date[]) {
  const first = days[0]
  const last = days.at(-1) ?? first
  if (isSameDay(first, last)) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(first)
  }
  return `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(first)} – ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(last)}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}
