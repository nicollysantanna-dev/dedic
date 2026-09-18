import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  UserX,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { AgendaPanelShell } from '@/features/appointments/AgendaPanelShell'
import {
  canCompleteAppointment,
  getAppointmentStatusLabel,
  type AppointmentOutcome,
} from '@/features/appointments/appointment-status'
import { canMoveAppointment } from '@/features/appointments/appointment-drag'
import { getBookingError } from '@/features/appointments/booking-errors'
import { InteractiveAgendaCalendar } from '@/features/appointments/InteractiveAgendaCalendar'
import { useAuth } from '@/features/auth/auth-context'
import { AvailabilityPanel } from '@/features/availability/AvailabilityPanel'
import { requireSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type AgendaPanel =
  'create' | 'appointment' | 'reschedule' | 'cancel' | 'availability' | null

export function AppointmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const opensCreatePanel = profile?.role === 'trainer' && searchParams.get('novo') === '1'
  const [cancellationNote, setCancellationNote] = useState('')
  const [outcomeTargetId, setOutcomeTargetId] = useState<string | null>(null)
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null)
  const [correctionReason, setCorrectionReason] = useState('')
  const [panel, setPanel] = useState<AgendaPanel>(opensCreatePanel ? 'create' : null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [bookingStudentId, setBookingStudentId] = useState('')
  const [bookingStart, setBookingStart] = useState(() =>
    opensCreatePanel ? toLocalDateTimeInput(nextHalfHour()) : '',
  )
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  )
  const notify = (text: string, tone: 'success' | 'error' = 'success') =>
    setToast({ text, tone })
  const [calendarRange, setCalendarRange] = useState(() => initialCalendarRange())
  const userId = profile?.id ?? ''
  const isTrainer = profile?.role === 'trainer'
  const lessonDurationMinutes = profile?.default_lesson_duration_minutes ?? 60
  const appointments = useQuery({
    queryKey: ['appointments', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const counterpart = isTrainer
        ? 'profiles!appointments_student_id_fkey(full_name)'
        : 'profiles!appointments_trainer_id_fkey(full_name)'
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select(`*, ${counterpart}`)
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .in('status', [
          'scheduled',
          'completed',
          'student_no_show',
          'cancelled_by_student',
          'cancelled_by_trainer',
          'cancelled_for_reschedule',
        ])
        .order('starts_at', { ascending: false })
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

  const studentRelationship = useQuery({
    queryKey: ['agenda-student-relationship', userId],
    enabled: Boolean(userId) && !isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'trainer_id, profiles!trainer_student_relationships_trainer_id_fkey(full_name)',
        )
        .eq('student_id', userId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const schedulerTrainerId = isTrainer
    ? userId
    : (studentRelationship.data?.trainer_id ?? '')

  const availableSlots = useQuery({
    queryKey: [
      'agenda-scheduler-slots',
      schedulerTrainerId,
      calendarRange.start.toISOString(),
      calendarRange.end.toISOString(),
    ],
    enabled: Boolean(schedulerTrainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_available_slots', {
        target_trainer_id: schedulerTrainerId,
        range_start: formatIsoDate(calendarRange.start),
        range_end: formatIsoDate(calendarRange.end),
      })
      if (error) throw error
      return data
    },
  })

  const blockedPeriods = useQuery({
    queryKey: [
      'agenda-scheduler-blocks',
      userId,
      calendarRange.start.toISOString(),
      calendarRange.end.toISOString(),
    ],
    enabled: Boolean(userId) && isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('availability_exceptions')
        .select('id, starts_at, ends_at')
        .eq('trainer_id', userId)
        .lt('starts_at', calendarRange.end.toISOString())
        .gt('ends_at', calendarRange.start.toISOString())
      if (error) throw error
      return data
    },
  })

  const effectiveBookingStudentId = isTrainer
    ? bookingStudentId || students.data?.[0]?.student_id || ''
    : userId
  const bookingBalance = useQuery({
    queryKey: ['credit-balance', effectiveBookingStudentId],
    enabled: Boolean(effectiveBookingStudentId) && panel === 'create',
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: effectiveBookingStudentId,
      })
      if (error) throw error
      return data
    },
  })

  const openCreatePanel = () => {
    setBookingStudentId('')
    setBookingStart(toLocalDateTimeInput(nextHalfHour()))
    setPanel('create')
  }

  useEffect(() => {
    if (!opensCreatePanel) return
    setSearchParams(
      (params) => {
        params.delete('novo')
        return params
      },
      { replace: true },
    )
  }, [opensCreatePanel, setSearchParams])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const refreshAgenda = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['agenda-scheduler-slots'] })
    void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
    void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] })
    void queryClient.invalidateQueries({ queryKey: ['trainer-home-appointments'] })
  }

  const booking = useMutation({
    mutationFn: async () => {
      if (!effectiveBookingStudentId) throw new Error('STUDENT_REQUIRED')
      if (!bookingStart || new Date(bookingStart) <= new Date()) {
        throw new Error('FUTURE_START_REQUIRED')
      }
      const request = isTrainer
        ? requireSupabase().rpc('book_appointment_for_student', {
            target_student_id: effectiveBookingStudentId,
            requested_start: new Date(bookingStart).toISOString(),
            requested_booking_id: crypto.randomUUID(),
          })
        : requireSupabase().rpc('book_appointment', {
            target_trainer_id: schedulerTrainerId,
            requested_start: new Date(bookingStart).toISOString(),
            requested_booking_id: crypto.randomUUID(),
          })
      const { error } = await request
      if (error) throw error
    },
    onSuccess: () => {
      const student = students.data?.find(
        (item) => item.student_id === effectiveBookingStudentId,
      )
      notify(
        `Aula agendada${student?.profiles?.full_name ? ` com ${student.profiles.full_name}` : ''}.`,
      )
      setPanel(null)
      setBookingStart('')
      refreshAgenda()
    },
  })

  const rescheduleAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      startsAt,
    }: {
      appointmentId: string
      startsAt: Date
    }) => {
      const { error } = await requireSupabase().rpc('reschedule_appointment', {
        target_appointment_id: appointmentId,
        requested_start: startsAt.toISOString(),
        requested_reschedule_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      notify(`Aula remarcada para ${formatDateTime(variables.startsAt)}.`)
      setPanel(null)
      setSelectedAppointmentId(null)
      refreshAgenda()
    },
  })

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await requireSupabase().rpc('cancel_appointment', {
        target_appointment_id: appointmentId,
        cancellation_note: cancellationNote.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCancellationNote('')
      setPanel(null)
      setSelectedAppointmentId(null)
      notify('Aula cancelada e crédito devolvido ao aluno.')
      refreshAgenda()
    },
  })

  const completeAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      outcome,
    }: {
      appointmentId: string
      outcome: AppointmentOutcome
    }) => {
      const { error } = await requireSupabase().rpc('complete_appointment', {
        target_appointment_id: appointmentId,
        requested_outcome: outcome,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setOutcomeTargetId(null)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['appointment-events'] })
    },
  })

  const correctOutcome = useMutation({
    mutationFn: async ({
      appointmentId,
      outcome,
    }: {
      appointmentId: string
      outcome: AppointmentOutcome
    }) => {
      const { error } = await requireSupabase().rpc('correct_appointment_outcome', {
        target_appointment_id: appointmentId,
        requested_outcome: outcome,
        correction_reason: correctionReason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCorrectionTargetId(null)
      setCorrectionReason('')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['appointment-events'] })
    },
  })

  const selectedAppointment = useMemo(
    () =>
      appointments.data?.find(
        (appointment) => appointment.id === selectedAppointmentId,
      ) ?? null,
    [appointments.data, selectedAppointmentId],
  )
  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Organize sua rotina de atendimento</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Agenda
            </h1>
          </div>
          {isTrainer && (
            <div className="flex flex-wrap gap-2">
              <Button
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setPanel('availability')}
                variant="outline"
              >
                <CalendarClock size={17} /> Horários e bloqueios
              </Button>
              <Button onClick={openCreatePanel}>
                <Plus size={17} /> Nova aula
              </Button>
            </div>
          )}
        </header>

        {appointments.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-6 text-sm font-semibold text-slate-300">
            Carregando agenda…
          </p>
        )}
        {appointments.error && (
          <p
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar sua agenda.
          </p>
        )}

        {!appointments.isLoading && !appointments.error && appointments.data && (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="size-3 rounded-sm bg-blue-100 ring-1 ring-blue-600" />
                Aula agendada
              </span>
              {schedulerTrainerId && (
                <>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-sm bg-blue-50 ring-1 ring-blue-100" />
                    Disponibilidade
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-sm bg-red-100 ring-1 ring-red-200" />
                    Bloqueado
                  </span>
                </>
              )}
            </div>
            <InteractiveAgendaCalendar
              appointments={appointments.data}
              availableSlots={availableSlots.data ?? []}
              blockedPeriods={blockedPeriods.data ?? []}
              canCreate={Boolean(schedulerTrainerId)}
              restrictCreationToAvailableSlots={!isTrainer}
              lessonDurationMinutes={lessonDurationMinutes}
              onRangeChange={(start, end) => setCalendarRange({ start, end })}
              onCreate={(start) => {
                setBookingStudentId('')
                setBookingStart(toLocalDateTimeInput(start))
                setPanel('create')
              }}
              onAppointmentClick={(appointmentId) => {
                setSelectedAppointmentId(appointmentId)
                setPanel('appointment')
              }}
              onAppointmentMove={(appointmentId, startsAt, revert) => {
                rescheduleAppointment.mutate(
                  { appointmentId, startsAt },
                  {
                    onError: (error) => {
                      revert()
                      notify(
                        `${getBookingError(error, 'reschedule')} O horário original foi mantido.`,
                        'error',
                      )
                    },
                  },
                )
              }}
            />
          </div>
        )}
      </div>

      <AgendaPanelShell open={Boolean(panel)} onClose={() => setPanel(null)}>
        {panel && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                  {panel === 'create'
                    ? 'Novo agendamento'
                    : panel === 'reschedule'
                      ? 'Remarcação'
                      : panel === 'cancel'
                        ? 'Cancelamento'
                        : panel === 'availability'
                          ? 'Sua rotina'
                          : 'Detalhes da aula'}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">
                  {panel === 'create'
                    ? 'Criar nova aula'
                    : panel === 'reschedule'
                      ? 'Escolher novo horário'
                      : panel === 'cancel'
                        ? 'Cancelar aula'
                        : panel === 'availability'
                          ? 'Horários e bloqueios'
                          : (selectedAppointment?.profiles?.full_name ?? 'Aula')}
                </h2>
              </div>
              <button
                aria-label="Fechar"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
                onClick={() => setPanel(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {panel === 'availability' && isTrainer && (
              <AvailabilityPanel trainerId={userId} />
            )}

            {panel === 'create' && (
              <div className="mt-7 space-y-5">
                {isTrainer ? (
                  <label className="block text-sm font-semibold">
                    Aluno
                    <select
                      className="field mt-2"
                      onChange={(event) => setBookingStudentId(event.target.value)}
                      value={effectiveBookingStudentId}
                    >
                      {students.data?.map((student) => (
                        <option key={student.student_id} value={student.student_id}>
                          {student.profiles?.full_name ?? 'Aluno'}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
                    Aula com{' '}
                    <strong>
                      {studentRelationship.data?.profiles?.full_name ?? 'seu personal'}
                    </strong>
                  </div>
                )}
                <label className="block text-sm font-semibold">
                  Data e horário
                  <input
                    className="field mt-2"
                    min={toLocalDateTimeInput(new Date())}
                    onChange={(event) => setBookingStart(event.target.value)}
                    type="datetime-local"
                    value={bookingStart}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Duração" value={`${lessonDurationMinutes} min`} />
                  <InfoCard
                    label="Créditos"
                    value={
                      bookingBalance.isLoading ? '…' : String(bookingBalance.data ?? 0)
                    }
                  />
                </div>
                {isTrainer && !students.isLoading && !students.data?.length && (
                  <PanelError text="Vincule um aluno antes de criar uma aula." />
                )}
                {!isTrainer && !studentRelationship.isLoading && !schedulerTrainerId && (
                  <PanelError text="Você ainda não possui um personal vinculado." />
                )}
                {booking.error && <PanelError text={getBookingError(booking.error)} />}
                <Button
                  className="w-full"
                  disabled={
                    booking.isPending ||
                    !effectiveBookingStudentId ||
                    (bookingBalance.data ?? 0) <= 0
                  }
                  onClick={() => booking.mutate()}
                >
                  {booking.isPending ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <CalendarPlus size={17} />
                  )}
                  Confirmar agendamento
                </Button>
              </div>
            )}

            {panel === 'appointment' && selectedAppointment && (
              <div className="mt-7">
                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm font-semibold capitalize">
                    {formatAppointmentDay(selectedAppointment.starts_at)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Clock3 size={16} />
                    {formatAppointmentTime(selectedAppointment.starts_at)}–
                    {formatAppointmentTime(selectedAppointment.ends_at)}
                  </p>
                  <span className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {getAppointmentStatusLabel(selectedAppointment.status)}
                  </span>
                </div>
                {canMoveAppointment(selectedAppointment) ? (
                  <div className="mt-5 grid gap-3">
                    <Button
                      onClick={() => {
                        setBookingStart(
                          toLocalDateTimeInput(new Date(selectedAppointment.starts_at)),
                        )
                        setPanel('reschedule')
                      }}
                    >
                      <CalendarPlus size={17} /> Remarcar aula
                    </Button>
                    <Button variant="outline" onClick={() => setPanel('cancel')}>
                      <XCircle size={17} /> Cancelar aula
                    </Button>
                    <p className="text-xs leading-5 text-slate-500">
                      No desktop, você também pode arrastar este card diretamente para
                      outro horário.
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    Esta aula não pode mais ser remarcada ou cancelada.
                  </p>
                )}

                {isTrainer &&
                  canCompleteAppointment(
                    selectedAppointment.status,
                    selectedAppointment.starts_at,
                  ) &&
                  (outcomeTargetId === selectedAppointment.id ? (
                    <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-950">
                        Como esta aula terminou?
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        O crédito consumido será mantido nas duas opções.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button
                          disabled={completeAppointment.isPending}
                          onClick={() =>
                            completeAppointment.mutate({
                              appointmentId: selectedAppointment.id,
                              outcome: 'completed',
                            })
                          }
                        >
                          <CheckCircle2 size={16} /> Realizada
                        </Button>
                        <Button
                          variant="outline"
                          disabled={completeAppointment.isPending}
                          onClick={() =>
                            completeAppointment.mutate({
                              appointmentId: selectedAppointment.id,
                              outcome: 'student_no_show',
                            })
                          }
                        >
                          <UserX size={16} /> Falta do aluno
                        </Button>
                      </div>
                      {completeAppointment.error && (
                        <PanelError text="Não foi possível registrar o resultado." />
                      )}
                    </div>
                  ) : (
                    <Button
                      className="mt-5 w-full"
                      onClick={() => setOutcomeTargetId(selectedAppointment.id)}
                    >
                      <CheckCircle2 size={17} /> Registrar resultado
                    </Button>
                  ))}

                {isTrainer &&
                  ['completed', 'student_no_show'].includes(selectedAppointment.status) &&
                  (correctionTargetId === selectedAppointment.id ? (
                    <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                      <label className="text-sm font-semibold text-amber-950">
                        Justificativa da correção
                        <textarea
                          className="field mt-2 min-h-24 resize-y bg-white"
                          onChange={(event) => setCorrectionReason(event.target.value)}
                          placeholder="Explique por que o resultado deve ser corrigido."
                          value={correctionReason}
                        />
                      </label>
                      <Button
                        className="mt-3 w-full"
                        disabled={
                          correctionReason.trim().length < 5 || correctOutcome.isPending
                        }
                        onClick={() =>
                          correctOutcome.mutate({
                            appointmentId: selectedAppointment.id,
                            outcome:
                              selectedAppointment.status === 'completed'
                                ? 'student_no_show'
                                : 'completed',
                          })
                        }
                      >
                        {correctOutcome.isPending ? (
                          <LoaderCircle className="animate-spin" size={16} />
                        ) : (
                          <PencilLine size={16} />
                        )}
                        Corrigir para{' '}
                        {selectedAppointment.status === 'completed'
                          ? 'falta'
                          : 'realizada'}
                      </Button>
                      {correctOutcome.error && (
                        <PanelError text="Não foi possível corrigir o resultado." />
                      )}
                    </div>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      variant="outline"
                      onClick={() => setCorrectionTargetId(selectedAppointment.id)}
                    >
                      <PencilLine size={17} /> Corrigir resultado
                    </Button>
                  ))}
              </div>
            )}

            {panel === 'reschedule' && selectedAppointment && (
              <div className="mt-7 space-y-5">
                <label className="block text-sm font-semibold">
                  Novo horário
                  <input
                    className="field mt-2"
                    min={toLocalDateTimeInput(new Date())}
                    onChange={(event) => setBookingStart(event.target.value)}
                    type="datetime-local"
                    value={bookingStart}
                  />
                </label>
                <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  A remarcação preserva um único consumo de crédito. Se o novo horário
                  estiver ocupado, a aula original será mantida.
                </p>
                {rescheduleAppointment.error && (
                  <PanelError
                    text={getBookingError(rescheduleAppointment.error, 'reschedule')}
                  />
                )}
                <Button
                  className="w-full"
                  disabled={rescheduleAppointment.isPending || !bookingStart}
                  onClick={() =>
                    rescheduleAppointment.mutate({
                      appointmentId: selectedAppointment.id,
                      startsAt: new Date(bookingStart),
                    })
                  }
                >
                  {rescheduleAppointment.isPending && (
                    <LoaderCircle className="animate-spin" size={17} />
                  )}
                  Confirmar remarcação
                </Button>
              </div>
            )}

            {panel === 'cancel' && selectedAppointment && (
              <div className="mt-7 space-y-5">
                <label className="block text-sm font-semibold">
                  Motivo ou observação (opcional)
                  <textarea
                    className="field mt-2 min-h-28 resize-y"
                    maxLength={300}
                    onChange={(event) => setCancellationNote(event.target.value)}
                    placeholder="Ex.: compromisso, indisposição ou viagem."
                    value={cancellationNote}
                  />
                </label>
                <p className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-900">
                  O horário será liberado e o crédito será devolvido ao aluno.
                </p>
                {cancelAppointment.error && (
                  <PanelError text={getBookingError(cancelAppointment.error, 'cancel')} />
                )}
                <Button
                  className="w-full"
                  disabled={cancelAppointment.isPending}
                  onClick={() => cancelAppointment.mutate(selectedAppointment.id)}
                >
                  {cancelAppointment.isPending && (
                    <LoaderCircle className="animate-spin" size={17} />
                  )}
                  Confirmar cancelamento
                </Button>
              </div>
            )}
          </>
        )}
      </AgendaPanelShell>

      <AnimatePresence>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md rounded-2xl p-4 text-sm font-semibold text-white shadow-2xl lg:bottom-6',
              toast.tone === 'error' ? 'bg-red-600' : 'bg-emerald-600',
            )}
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  )
}

function PanelError({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-900" role="alert">
      {text}
    </p>
  )
}

function formatAppointmentDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value))
}

function formatAppointmentTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function toLocalDateTimeInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function nextHalfHour() {
  const value = new Date()
  value.setSeconds(0, 0)
  const minutes = value.getMinutes()
  value.setMinutes(minutes < 30 ? 30 : 60)
  return value
}

function initialCalendarRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

function formatIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
