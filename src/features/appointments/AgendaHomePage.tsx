import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PackageCheck,
  ReceiptText,
  UserRound,
  UsersRound,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import { AppointmentCalendar } from '@/features/appointments/AppointmentCalendar'
import { getAppointmentStatusLabel } from '@/features/appointments/appointment-status'
import { getBookingError } from '@/features/appointments/booking-errors'
import { toIsoDate } from '@/features/availability/date-utils'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

type AgendaPanel = 'create' | 'appointment' | 'reschedule' | 'cancel' | null
type Slot = { slot_start: string; slot_end: string }

export function AgendaHomePage() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedStudentId, setSelectedStudentId] = useState('all')
  const [panel, setPanel] = useState<AgendaPanel>(null)
  const [selectedAppointment, setSelectedAppointment] =
    useState<Tables<'appointments'> | null>(null)
  const [bookingStudentId, setBookingStudentId] = useState('')
  const [bookingStart, setBookingStart] = useState('')
  const [cancellationNote, setCancellationNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const userId = profile?.id ?? ''
  const isTrainer = profile?.role === 'trainer'
  const rangeStart = useMemo(() => new Date(), [])
  const rangeEnd = useMemo(() => {
    const value = new Date()
    value.setDate(value.getDate() + 45)
    return value
  }, [])

  const relationship = useQuery({
    queryKey: ['agenda-relationship', userId],
    enabled: Boolean(userId) && !isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select('trainer_id')
        .eq('student_id', userId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const students = useQuery({
    queryKey: ['agenda-students', userId],
    enabled: Boolean(userId) && isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'student_id, profiles!trainer_student_relationships_student_id_fkey(full_name)',
        )
        .eq('trainer_id', userId)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
  })

  const appointments = useQuery({
    queryKey: ['agenda-home-appointments', userId, isTrainer],
    enabled: Boolean(userId),
    queryFn: async () => {
      const counterpart = isTrainer
        ? 'profiles!appointments_student_id_fkey(full_name)'
        : 'profiles!appointments_trainer_id_fkey(full_name)'
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select(`*, ${counterpart}`)
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .in('status', ['scheduled', 'completed', 'student_no_show'])
        .order('starts_at')
      if (error) throw error
      return data
    },
  })

  const trainerId = isTrainer ? userId : relationship.data?.trainer_id
  const availableSlots = useQuery({
    queryKey: ['agenda-home-slots', trainerId, toIsoDate(rangeStart)],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      if (!trainerId) return []
      const { data, error } = await requireSupabase().rpc('get_available_slots', {
        target_trainer_id: trainerId,
        range_start: toIsoDate(rangeStart),
        range_end: toIsoDate(rangeEnd),
      })
      if (error) throw error
      return data
    },
  })

  const blockedPeriods = useQuery({
    queryKey: ['agenda-home-blocks', userId],
    enabled: Boolean(userId) && isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('availability_exceptions')
        .select('*')
        .eq('trainer_id', userId)
        .gte('ends_at', rangeStart.toISOString())
        .order('starts_at')
      if (error) throw error
      return data
    },
  })

  const balanceStudentId = isTrainer
    ? selectedStudentId === 'all'
      ? undefined
      : selectedStudentId
    : userId
  const balance = useQuery({
    queryKey: ['credit-balance', balanceStudentId],
    enabled: Boolean(balanceStudentId),
    queryFn: async () => {
      if (!balanceStudentId) return 0
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: balanceStudentId,
      })
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const refreshAgenda = () => {
    void queryClient.invalidateQueries({ queryKey: ['agenda-home-appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['agenda-home-slots'] })
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['available-slots'] })
    void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
  }

  const booking = useMutation({
    mutationFn: async () => {
      const targetStudentId = bookingStudentId || students.data?.[0]?.student_id
      if (!targetStudentId) throw new Error('STUDENT_REQUIRED')
      if (!bookingStart || new Date(bookingStart) <= new Date()) {
        throw new Error('FUTURE_START_REQUIRED')
      }
      const { error } = await requireSupabase().rpc('book_appointment_for_student', {
        target_student_id: targetStudentId,
        requested_start: new Date(bookingStart).toISOString(),
        requested_booking_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      const student = students.data?.find(
        ({ student_id }) =>
          student_id === (bookingStudentId || students.data?.[0]?.student_id),
      )
      setToast(
        `Aula agendada${student?.profiles?.full_name ? ` com ${student.profiles.full_name}` : ''} para ${formatShortDateTime(bookingStart)}.`,
      )
      setPanel(null)
      setBookingStart('')
      refreshAgenda()
    },
  })

  const cancelAppointment = useMutation({
    mutationFn: async () => {
      if (!selectedAppointment) throw new Error('APPOINTMENT_REQUIRED')
      const { error } = await requireSupabase().rpc('cancel_appointment', {
        target_appointment_id: selectedAppointment.id,
        cancellation_note: cancellationNote.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setToast('Aula cancelada e crédito devolvido ao aluno.')
      setPanel(null)
      setSelectedAppointment(null)
      setCancellationNote('')
      refreshAgenda()
    },
  })

  const rescheduleAppointment = useMutation({
    mutationFn: async (slot: Slot) => {
      if (!selectedAppointment) throw new Error('APPOINTMENT_REQUIRED')
      const { error } = await requireSupabase().rpc('reschedule_appointment', {
        target_appointment_id: selectedAppointment.id,
        requested_start: slot.slot_start,
        requested_reschedule_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: (_data, slot) => {
      setToast(`Aula remarcada para ${formatShortDateTime(slot.slot_start)}.`)
      setPanel(null)
      setSelectedAppointment(null)
      refreshAgenda()
    },
  })

  const studentBooking = useMutation({
    mutationFn: async (slot: Slot) => {
      if (!trainerId) throw new Error('RELATIONSHIP_REQUIRED')
      const { error } = await requireSupabase().rpc('book_appointment', {
        target_trainer_id: trainerId,
        requested_start: slot.slot_start,
        requested_booking_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: (_data, slot) => {
      setToast(`Aula agendada para ${formatShortDateTime(slot.slot_start)}.`)
      refreshAgenda()
    },
  })

  if (!profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f4f1e9] text-sm font-semibold">
        Carregando agenda…
      </main>
    )
  }

  const filteredAppointments =
    isTrainer && selectedStudentId !== 'all'
      ? (appointments.data ?? []).filter(
          (appointment) => appointment.student_id === selectedStudentId,
        )
      : (appointments.data ?? [])
  const dayAppointments = filteredAppointments.filter((appointment) =>
    isSameDay(new Date(appointment.starts_at), selectedDay),
  )
  const daySlots = (availableSlots.data ?? []).filter((slot) =>
    isSameDay(new Date(slot.slot_start), selectedDay),
  )
  const dayBlocks = (blockedPeriods.data ?? []).filter((block) =>
    isSameDay(new Date(block.starts_at), selectedDay),
  )
  const selectedStudent = students.data?.find(
    (student) => student.student_id === selectedStudentId,
  )
  const hasAgendaError =
    appointments.error || availableSlots.error || blockedPeriods.error

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-4 py-5 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
              {isTrainer ? 'Agenda do personal' : 'Minha agenda'}
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-[-0.055em] sm:text-5xl">
              Olá, {profile.full_name.split(' ')[0]}.
            </h1>
          </div>
          <Button variant="ghost" type="button" onClick={() => void signOut()}>
            <LogOut size={17} /> Sair
          </Button>
        </header>

        <nav
          className="mt-6 flex gap-2 overflow-x-auto pb-2"
          aria-label="Ações da agenda"
        >
          <ActionLink to="/app/agenda" icon={CalendarCheck} label="Todas as aulas" />
          {isTrainer ? (
            <>
              <ActionLink to="/app/criar-aula" icon={CalendarPlus} label="Criar aula" />
              <ActionLink
                to="/app/disponibilidade"
                icon={CalendarClock}
                label="Disponibilidade"
              />
              <ActionLink to="/app/disponibilidade" icon={Ban} label="Bloquear" />
            </>
          ) : (
            <ActionLink to="/app/calendario" icon={CalendarPlus} label="Agendar" />
          )}
          <ActionLink to="/app/pacotes" icon={PackageCheck} label="Pacotes" />
          <ActionLink to="/app/pagamentos" icon={ReceiptText} label="Pagamentos" />
          <ActionLink
            to="/app/resumo"
            icon={LayoutDashboard}
            label={isTrainer ? 'Alunos e vínculos' : 'Meu personal'}
          />
        </nav>

        {isTrainer && (
          <label className="mt-5 block max-w-sm text-sm font-semibold">
            Filtrar por aluno
            <select
              className="field mt-2"
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            >
              <option value="all">Todos os alunos</option>
              {students.data?.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.profiles?.full_name ?? 'Aluno'}
                </option>
              ))}
            </select>
          </label>
        )}

        {hasAgendaError && (
          <p
            className="mt-5 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            Não foi possível carregar todos os dados da agenda.
          </p>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <AppointmentCalendar
            appointments={filteredAppointments}
            availableSlots={availableSlots.data ?? []}
            blockedPeriods={blockedPeriods.data ?? []}
            selected={selectedDay}
            onSelect={(date) => {
              if (date) setSelectedDay(date)
            }}
            onDayClick={(date) => {
              setSelectedDay(date)
              if (isTrainer) {
                setBookingStudentId(selectedStudentId === 'all' ? '' : selectedStudentId)
                setBookingStart(toLocalDateTimeInput(defaultStartForDay(date)))
                setPanel('create')
              }
            }}
          />

          <aside className="mt-8 rounded-[2rem] bg-[#173d2c] p-5 text-white sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#efc86f]">
              {formatDay(selectedDay)}
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">Agenda do dia</h2>

            {selectedStudent && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 p-4">
                <span className="flex items-center gap-2 font-semibold">
                  <UserRound size={17} /> {selectedStudent.profiles?.full_name}
                </span>
                <span className="text-sm text-[#efc86f]">
                  {balance.isLoading ? '…' : `${balance.data ?? 0} créditos`}
                </span>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {dayAppointments.map((appointment) => (
                <button
                  className="block w-full rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
                  key={appointment.id}
                  type="button"
                  onClick={() => {
                    setSelectedAppointment(appointment)
                    setPanel('appointment')
                  }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong>{formatTime(appointment.starts_at)}</strong>
                    <span className="text-xs text-[#b9cdc1]">
                      {getAppointmentStatusLabel(appointment.status)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-[#b9cdc1]">
                    {appointment.profiles?.full_name ??
                      (isTrainer ? 'Aluno' : 'Personal')}
                  </span>
                </button>
              ))}
              {dayBlocks.map((block) => (
                <div
                  className="rounded-2xl border border-[#efc86f]/25 p-4"
                  key={block.id}
                >
                  <span className="flex items-center gap-2 font-semibold text-[#efc86f]">
                    <Ban size={16} /> Bloqueado
                  </span>
                  <span className="mt-1 block text-sm text-[#b9cdc1]">
                    {formatTime(block.starts_at)}–{formatTime(block.ends_at)} ·{' '}
                    {block.reason || 'Sem motivo'}
                  </span>
                </div>
              ))}
              {!dayAppointments.length && !dayBlocks.length && (
                <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-[#b9cdc1]">
                  Nenhuma aula ou bloqueio neste dia.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 size={16} /> {daySlots.length} horários livres
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {daySlots.slice(0, 8).map((slot) => (
                  <button
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-[#d6a850] hover:text-[#173326]"
                    disabled={studentBooking.isPending}
                    key={slot.slot_start}
                    type="button"
                    onClick={() => {
                      if (isTrainer) {
                        setBookingStudentId(
                          selectedStudentId === 'all' ? '' : selectedStudentId,
                        )
                        setBookingStart(toLocalDateTimeInput(new Date(slot.slot_start)))
                        setPanel('create')
                      } else {
                        studentBooking.mutate(slot)
                      }
                    }}
                  >
                    {formatTime(slot.slot_start)}
                  </button>
                ))}
              </div>
              {isTrainer ? (
                <Button
                  className="mt-4 w-full bg-[#d6a850] text-[#173326]"
                  type="button"
                  onClick={() => {
                    setBookingStudentId(
                      selectedStudentId === 'all' ? '' : selectedStudentId,
                    )
                    setBookingStart(toLocalDateTimeInput(defaultStartForDay(selectedDay)))
                    setPanel('create')
                  }}
                >
                  <CalendarPlus size={16} />
                  Agendar para aluno
                </Button>
              ) : (
                <Button className="mt-4 w-full bg-[#d6a850] text-[#173326]" asChild>
                  <Link to="/app/calendario">
                    <CalendarPlus size={16} /> Escolher horário
                  </Link>
                </Button>
              )}
            </div>
          </aside>
        </div>

        {!isTrainer && (
          <section
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-label="Resumo"
          >
            <SummaryCard
              icon={CreditCard}
              label="Créditos"
              value={String(balance.data ?? 0)}
            />
            <SummaryCard
              icon={CalendarCheck}
              label="Aulas futuras"
              value={String(
                (appointments.data ?? []).filter(
                  (item) =>
                    item.status === 'scheduled' && new Date(item.starts_at) > new Date(),
                ).length,
              )}
            />
            <SummaryCard
              icon={UsersRound}
              label="Personal"
              value={relationship.data ? 'Vinculado' : 'Pendente'}
            />
          </section>
        )}

        <AnimatePresence>
          {panel && isTrainer && (
            <AgendaSheet
              panel={panel}
              appointment={selectedAppointment}
              students={students.data ?? []}
              slots={availableSlots.data ?? []}
              bookingStudentId={bookingStudentId || students.data?.[0]?.student_id || ''}
              bookingStart={bookingStart}
              cancellationNote={cancellationNote}
              bookingPending={booking.isPending}
              cancellationPending={cancelAppointment.isPending}
              reschedulePending={rescheduleAppointment.isPending}
              error={
                booking.error || cancelAppointment.error || rescheduleAppointment.error
              }
              onClose={() => {
                setPanel(null)
                setSelectedAppointment(null)
                setCancellationNote('')
              }}
              onPanelChange={setPanel}
              onStudentChange={setBookingStudentId}
              onStartChange={setBookingStart}
              onCancellationNoteChange={setCancellationNote}
              onBook={() => booking.mutate()}
              onCancel={() => cancelAppointment.mutate()}
              onReschedule={(slot) => rescheduleAppointment.mutate(slot)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && <AgendaToast message={toast} onClose={() => setToast(null)} />}
        </AnimatePresence>
        {studentBooking.error && (
          <p
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a] shadow-lg"
            role="alert"
          >
            {getBookingError(studentBooking.error)}
          </p>
        )}
      </PageReveal>
    </main>
  )
}

function AgendaSheet({
  panel,
  appointment,
  students,
  slots,
  bookingStudentId,
  bookingStart,
  cancellationNote,
  bookingPending,
  cancellationPending,
  reschedulePending,
  error,
  onClose,
  onPanelChange,
  onStudentChange,
  onStartChange,
  onCancellationNoteChange,
  onBook,
  onCancel,
  onReschedule,
}: {
  panel: Exclude<AgendaPanel, null>
  appointment: Tables<'appointments'> | null
  students: Array<{ student_id: string; profiles: { full_name: string } | null }>
  slots: Slot[]
  bookingStudentId: string
  bookingStart: string
  cancellationNote: string
  bookingPending: boolean
  cancellationPending: boolean
  reschedulePending: boolean
  error: Error | null
  onClose: () => void
  onPanelChange: (panel: Exclude<AgendaPanel, null>) => void
  onStudentChange: (studentId: string) => void
  onStartChange: (value: string) => void
  onCancellationNoteChange: (value: string) => void
  onBook: () => void
  onCancel: () => void
  onReschedule: (slot: Slot) => void
}) {
  const pending = bookingPending || cancellationPending || reschedulePending

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#10271e]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <motion.section
        className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#f7f4ec] p-5 shadow-[0_-20px_60px_rgba(16,39,30,0.25)] sm:rounded-[2rem] sm:p-7"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 330, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-sheet-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a47b2e]">
              {panel === 'create'
                ? 'Novo agendamento'
                : panel === 'reschedule'
                  ? 'Escolher novo horário'
                  : panel === 'cancel'
                    ? 'Cancelar aula'
                    : 'Detalhes da aula'}
            </p>
            <h2
              className="font-display mt-1 text-2xl font-bold tracking-[-0.04em]"
              id="agenda-sheet-title"
            >
              {panel === 'create'
                ? 'Agendar aula'
                : appointment
                  ? formatLongDateTime(appointment.starts_at)
                  : 'Aula'}
            </h2>
          </div>
          <Button variant="ghost" type="button" disabled={pending} onClick={onClose}>
            <X size={19} /> <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {panel === 'create' && (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Aluno
              <select
                className="field mt-2"
                value={bookingStudentId}
                onChange={(event) => onStudentChange(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.profiles?.full_name ?? 'Aluno'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Data e horário
              <input
                className="field mt-2"
                type="datetime-local"
                min={toLocalDateTimeInput(new Date())}
                value={bookingStart}
                onChange={(event) => onStartChange(event.target.value)}
              />
            </label>
            {!students.length && (
              <p className="rounded-2xl bg-[#f4ead2] p-4 text-sm text-[#77551f]">
                Vincule um aluno antes de criar uma aula.
              </p>
            )}
            <Button
              className="w-full"
              disabled={!students.length || !bookingStart || pending}
              onClick={onBook}
            >
              {bookingPending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <CalendarPlus size={17} />
              )}
              Confirmar agendamento
            </Button>
          </div>
        )}

        {panel === 'appointment' && appointment && (
          <div className="mt-6">
            <div className="rounded-2xl bg-[#e7eee7] p-4">
              <p className="text-sm font-semibold">
                {formatTime(appointment.starts_at)}–{formatTime(appointment.ends_at)}
              </p>
              <p className="mt-1 text-xs text-[#687b71]">
                {getAppointmentStatusLabel(appointment.status)}
              </p>
            </div>
            {appointment.status === 'scheduled' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => onPanelChange('reschedule')}>
                  <CalendarClock size={17} /> Remarcar
                </Button>
                <Button
                  className="border-[#a95040]/25 text-[#943f32]"
                  variant="outline"
                  onClick={() => onPanelChange('cancel')}
                >
                  <XCircle size={17} /> Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {panel === 'cancel' && appointment && (
          <div className="mt-6">
            <p className="rounded-2xl bg-[#f2ded7] p-4 text-sm leading-6 text-[#853d30]">
              O horário será liberado e um crédito será devolvido ao aluno. O registro
              continuará no histórico.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Motivo do cancelamento (opcional)
              <textarea
                className="field mt-2 min-h-20 resize-y"
                maxLength={300}
                value={cancellationNote}
                onChange={(event) => onCancellationNoteChange(event.target.value)}
                placeholder="Ex.: compromisso, indisposição ou viagem."
              />
            </label>
            <Button
              className="mt-3 w-full bg-[#a95040] text-white hover:bg-[#943f32]"
              disabled={pending || appointment.status !== 'scheduled'}
              onClick={onCancel}
            >
              {cancellationPending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <XCircle size={17} />
              )}
              Confirmar cancelamento
            </Button>
            <Button
              className="mt-2 w-full"
              variant="ghost"
              disabled={pending}
              onClick={() => onPanelChange('appointment')}
            >
              Voltar sem cancelar
            </Button>
          </div>
        )}

        {panel === 'reschedule' && appointment && (
          <div className="mt-6">
            <p className="text-sm leading-6 text-[#687b71]">
              Toque no novo horário. A aula atual só será cancelada quando a troca for
              concluída.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {slots.slice(0, 16).map((slot) => (
                <button
                  className="rounded-2xl border border-[#173d2c]/10 bg-white p-3 text-left disabled:opacity-50"
                  disabled={pending}
                  key={slot.slot_start}
                  type="button"
                  onClick={() => onReschedule(slot)}
                >
                  <strong className="block text-sm">
                    {formatCompactDay(slot.slot_start)}
                  </strong>
                  <span className="mt-1 block text-xs text-[#687b71]">
                    {formatTime(slot.slot_start)}
                  </span>
                </button>
              ))}
            </div>
            {!slots.length && (
              <p className="rounded-2xl border border-dashed border-[#173d2c]/15 p-5 text-center text-sm text-[#687b71]">
                Nenhum horário livre disponível.
              </p>
            )}
            <Button
              className="mt-4"
              variant="ghost"
              onClick={() => onPanelChange('appointment')}
            >
              Voltar aos detalhes
            </Button>
          </div>
        )}

        {error && (
          <p
            className="mt-4 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            {error.message.includes('FUTURE_START_REQUIRED')
              ? 'Escolha uma data e hora futuras.'
              : error.message.includes('STUDENT_REQUIRED')
                ? 'Escolha um aluno.'
                : getBookingError(error)}
          </p>
        )}
      </motion.section>
    </motion.div>
  )
}

function AgendaToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      className="fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-[#173d2c] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(16,39,30,0.3)]"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        <CalendarCheck className="shrink-0 text-[#efc86f]" size={18} /> {message}
      </span>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">
        <X size={17} />
      </button>
    </motion.div>
  )
}

function ActionLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#173d2c]/10 bg-white/60 px-4 text-sm font-semibold"
      to={to}
    >
      <Icon size={16} /> {label}
    </Link>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl bg-white/60 p-4">
      <Icon className="text-[#a47b2e]" size={20} />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-[#718178]">
        {label}
      </p>
      <p className="font-display mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatDay(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(value)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatLongDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCompactDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function defaultStartForDay(day: Date) {
  const start = new Date(day)
  const now = new Date()
  if (isSameDay(start, now)) {
    start.setHours(now.getHours() + 1, 0, 0, 0)
  } else {
    start.setHours(8, 0, 0, 0)
  }
  return start
}

function toLocalDateTimeInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
