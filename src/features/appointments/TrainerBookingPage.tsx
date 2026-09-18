import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  UserRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { AgendaTimeline } from '@/features/appointments/AgendaTimeline'
import {
  addAgendaDays,
  getAgendaDays,
  type AgendaView,
} from '@/features/appointments/agenda-view'
import { getBookingError } from '@/features/appointments/booking-errors'
import { toIsoDate } from '@/features/availability/date-utils'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

export function TrainerBookingPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [view, setView] = useState<AgendaView>('day')
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const trainerId = profile?.id ?? ''
  const lessonDurationMinutes = profile?.default_lesson_duration_minutes ?? 60
  const visibleDays = useMemo(() => getAgendaDays(anchorDate, view), [anchorDate, view])
  const rangeStart = visibleDays[0]
  const rangeEnd = addAgendaDays(visibleDays.at(-1) ?? rangeStart, 1)

  const relationships = useQuery({
    queryKey: ['trainer-booking-students', trainerId],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'student_id, profiles!trainer_student_relationships_student_id_fkey(full_name)',
        )
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
  })
  const selectedStudent = studentId || relationships.data?.[0]?.student_id || ''
  const selectedStudentName =
    relationships.data?.find((item) => item.student_id === selectedStudent)?.profiles
      ?.full_name ?? 'Aluno'

  const balance = useQuery({
    queryKey: ['credit-balance', selectedStudent],
    enabled: Boolean(selectedStudent),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: selectedStudent,
      })
      if (error) throw error
      return data
    },
  })
  const slots = useQuery({
    queryKey: [
      'trainer-booking-slots',
      trainerId,
      toIsoDate(rangeStart),
      toIsoDate(rangeEnd),
    ],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_available_slots', {
        target_trainer_id: trainerId,
        range_start: toIsoDate(rangeStart),
        range_end: toIsoDate(rangeEnd),
      })
      if (error) throw error
      return data
    },
  })
  const appointments = useQuery({
    queryKey: [
      'trainer-booking-appointments',
      trainerId,
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
    ],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select(
          'id, starts_at, ends_at, status, profiles!appointments_student_id_fkey(full_name)',
        )
        .eq('trainer_id', trainerId)
        .gte('starts_at', rangeStart.toISOString())
        .lt('starts_at', rangeEnd.toISOString())
        .in('status', ['scheduled', 'completed', 'student_no_show'])
        .order('starts_at')
      if (error) throw error
      return data
    },
  })

  const booking = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('STUDENT_REQUIRED')
      if (!selectedStart || new Date(selectedStart) <= new Date()) {
        throw new Error('FUTURE_START_REQUIRED')
      }
      const { error } = await requireSupabase().rpc('book_appointment_for_student', {
        target_student_id: selectedStudent,
        requested_start: selectedStart,
        requested_booking_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setSuccessMessage(`Aula de ${selectedStudentName} agendada com sucesso.`)
      setSelectedStart(null)
      void queryClient.invalidateQueries({ queryKey: ['trainer-booking-slots'] })
      void queryClient.invalidateQueries({ queryKey: ['trainer-booking-appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['trainer-home-appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
    },
  })

  if (profile?.role !== 'trainer') return <Navigate to="/app" replace />

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">
        <Link
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
          to="/app/agenda"
        >
          <ArrowLeft size={17} /> Voltar para agenda
        </Link>
        <header className="mt-4">
          <p className="text-sm text-slate-400">Agendamento pelo personal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Criar nova aula
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Escolha o aluno e toque diretamente no calendário. A aula consumirá um crédito
            após a confirmação.
          </p>
        </header>

        <section className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:p-5">
          <label className="text-sm font-semibold">
            Aluno
            <select
              className="field mt-2 border-white/15 bg-white/10 text-white"
              onChange={(event) => {
                setStudentId(event.target.value)
                setSelectedStart(null)
              }}
              value={selectedStudent}
            >
              {relationships.data?.map((relationship) => (
                <option
                  className="text-slate-950"
                  key={relationship.student_id}
                  value={relationship.student_id}
                >
                  {relationship.profiles?.full_name ?? 'Aluno'}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-h-11 items-center gap-3 rounded-xl bg-white/5 px-4 text-sm">
            <CreditCard className="text-blue-400" size={18} />
            <span className="text-slate-400">Créditos:</span>
            <strong>{balance.isLoading ? '…' : (balance.data ?? 0)}</strong>
          </div>
        </section>

        {relationships.error && (
          <ErrorMessage text="Não foi possível carregar seus alunos." />
        )}
        {!relationships.isLoading && !relationships.data?.length && (
          <EmptyMessage text="Vincule um aluno antes de criar uma aula." />
        )}

        {relationships.data?.length ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-sm border border-blue-200 bg-blue-50" />
                Horário publicado
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-sm border border-slate-300 bg-white" />
                Fora da disponibilidade
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-sm border border-blue-600 bg-blue-100" />
                Selecionado
              </span>
            </div>

            {(slots.isLoading || appointments.isLoading) && (
              <p className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-6 text-sm text-slate-300">
                Carregando calendário…
              </p>
            )}
            {(slots.error || appointments.error) && (
              <ErrorMessage text="Não foi possível carregar a agenda deste período." />
            )}
            {!slots.isLoading &&
              !appointments.isLoading &&
              !slots.error &&
              !appointments.error && (
                <div className="mt-4">
                  <AgendaTimeline
                    anchorDate={anchorDate}
                    appointments={appointments.data ?? []}
                    availableSlots={slots.data ?? []}
                    onAnchorDateChange={(date) => {
                      setAnchorDate(date)
                      setSelectedStart(null)
                    }}
                    onSelectDay={setAnchorDate}
                    onSelectSlot={(startsAt) => {
                      setSelectedStart(startsAt)
                      setSuccessMessage(null)
                    }}
                    onViewChange={(nextView) => {
                      setView(nextView)
                      setSelectedStart(null)
                    }}
                    selectedSlotStart={selectedStart}
                    slotDurationMinutes={lessonDurationMinutes}
                    view={view}
                  />
                </div>
              )}
          </>
        ) : null}

        <AnimatePresence>
          {selectedStart && (
            <motion.section
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-20 z-30 mt-5 flex flex-col gap-4 rounded-[1.25rem] border border-blue-400/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:bottom-5 sm:flex-row sm:items-center sm:justify-between"
              exit={{ opacity: 0, y: 12 }}
              initial={{ opacity: 0, y: 12 }}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                  <CalendarCheck size={20} />
                </span>
                <div>
                  <p className="font-semibold">{selectedStudentName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock3 size={14} /> {formatSelection(selectedStart)} ·{' '}
                    {lessonDurationMinutes} min
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={booking.isPending || (balance.data ?? 0) <= 0}
                  onClick={() => booking.mutate()}
                >
                  {booking.isPending ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <CalendarPlus size={17} />
                  )}
                  Confirmar aula
                </Button>
                <Button variant="ghost" onClick={() => setSelectedStart(null)}>
                  <X size={17} />
                  <span className="sr-only">Cancelar seleção</span>
                </Button>
              </div>
              {(balance.data ?? 0) <= 0 && !balance.isLoading && (
                <p className="text-xs text-amber-200 sm:absolute sm:-top-7 sm:right-0">
                  Este aluno não possui créditos disponíveis.
                </p>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {booking.error && (
          <ErrorMessage
            text={
              booking.error.message.includes('FUTURE_START_REQUIRED')
                ? 'Escolha uma data e hora futuras.'
                : getBookingError(booking.error)
            }
          />
        )}

        <AnimatePresence>
          {successMessage && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-600 p-4 text-sm font-semibold text-white shadow-2xl lg:bottom-6"
              exit={{ opacity: 0, y: 12 }}
              initial={{ opacity: 0, y: 12 }}
              role="status"
            >
              <CheckCircle2 size={20} />
              <span className="flex-1">{successMessage}</span>
              <button
                aria-label="Fechar aviso"
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
                onClick={() => setSuccessMessage(null)}
                type="button"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <p
      className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
      role="alert"
    >
      {text}
    </p>
  )
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center">
      <UserRound className="mx-auto text-blue-400" />
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  )
}

function formatSelection(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
