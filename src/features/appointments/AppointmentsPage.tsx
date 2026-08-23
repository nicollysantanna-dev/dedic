import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  Clock3,
  History,
  LoaderCircle,
  PencilLine,
  UserRound,
  UserX,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import {
  canCompleteAppointment,
  getAppointmentStatusLabel,
  type AppointmentOutcome,
} from '@/features/appointments/appointment-status'
import { AppointmentCalendar } from '@/features/appointments/AppointmentCalendar'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

export function AppointmentsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancellationNote, setCancellationNote] = useState('')
  const [outcomeTargetId, setOutcomeTargetId] = useState<string | null>(null)
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null)
  const [correctionReason, setCorrectionReason] = useState('')
  const [selectedDay, setSelectedDay] = useState<Date>()
  const userId = profile?.id ?? ''
  const isTrainer = profile?.role === 'trainer'
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

  const appointmentEvents = useQuery({
    queryKey: ['appointment-events', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointment_events')
        .select('*')
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .in('event_type', ['completed', 'student_no_show', 'cancelled'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
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
      setCancelTargetId(null)
      setCancellationNote('')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] })
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

  const displayedAppointments = selectedDay
    ? appointments.data?.filter((appointment) =>
        isSameDay(new Date(appointment.starts_at), selectedDay),
      )
    : appointments.data

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app"
        >
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>
        <header className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
            Próximas aulas
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            Sua agenda.
          </h1>
          <p className="mt-3 text-[#60746a]">
            {isTrainer
              ? 'Conclua as aulas iniciadas e mantenha o histórico do aluno atualizado.'
              : 'Aulas agendadas e resultados aparecem aqui para você acompanhar.'}
          </p>
        </header>

        {appointments.isLoading && (
          <p className="mt-10 text-sm font-semibold">Carregando agenda…</p>
        )}
        {appointments.error && (
          <p
            className="mt-8 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            Não foi possível carregar sua agenda.
          </p>
        )}

        {!appointments.isLoading && !appointments.error && appointments.data && (
          <AppointmentCalendar
            appointments={appointments.data}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
        )}

        <div className="mt-8 space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {displayedAppointments?.map((appointment) => {
              const isFuture = new Date(appointment.starts_at) > new Date()
              const canComplete =
                isTrainer &&
                canCompleteAppointment(appointment.status, appointment.starts_at)
              const isFinal = ['completed', 'student_no_show'].includes(
                appointment.status,
              )
              const events = appointmentEvents.data?.filter(
                (event) => event.appointment_id === appointment.id,
              )

              return (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  className="rounded-[1.75rem] border border-[#173d2c]/8 bg-white/60 p-5"
                  key={appointment.id}
                >
                  <div className="flex items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#173d2c] text-[#efc86f]">
                      <CalendarCheck size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-bold capitalize">
                        {formatAppointmentDay(appointment.starts_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#687b71]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={15} />
                          {formatAppointmentTime(appointment.starts_at)}–
                          {formatAppointmentTime(appointment.ends_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={15} />
                          {appointment.profiles?.full_name ??
                            (isTrainer ? 'Aluno' : 'Personal')}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        appointment.status === 'student_no_show'
                          ? 'bg-[#f2ded7] text-[#8e483a]'
                          : 'bg-[#dcebdc] text-[#285b40]'
                      }`}
                    >
                      {getAppointmentStatusLabel(appointment.status)}
                    </span>
                  </div>

                  {cancelTargetId === appointment.id ? (
                    <div className="mt-4 rounded-2xl bg-[#f2ded7] p-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
                      <div>
                        <p className="font-semibold text-[#7f382d]">
                          Cancelar esta aula?
                        </p>
                        <p className="mt-1 text-xs text-[#8e5b52]">
                          O horário será liberado e 1 crédito será devolvido.
                        </p>
                      </div>
                      <label className="mt-3 block text-sm font-semibold text-[#7f382d] sm:basis-full">
                        Motivo ou observação (opcional)
                        <textarea
                          className="field mt-2 min-h-20 resize-y bg-white"
                          maxLength={300}
                          value={cancellationNote}
                          onChange={(event) => setCancellationNote(event.target.value)}
                          placeholder="Ex.: compromisso, indisposição ou viagem."
                        />
                      </label>
                      <div className="mt-3 flex gap-2 sm:mt-0">
                        <Button
                          disabled={cancelAppointment.isPending}
                          onClick={() => cancelAppointment.mutate(appointment.id)}
                        >
                          {cancelAppointment.isPending && (
                            <LoaderCircle className="animate-spin" size={16} />
                          )}
                          Confirmar cancelamento
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={cancelAppointment.isPending}
                          onClick={() => {
                            setCancelTargetId(null)
                            setCancellationNote('')
                          }}
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : outcomeTargetId === appointment.id ? (
                    <div className="mt-4 rounded-2xl bg-[#e8eee7] p-4">
                      <p className="font-semibold">Como esta aula terminou?</p>
                      <p className="mt-1 text-xs text-[#687b71]">
                        O crédito já consumido será mantido nas duas opções.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          disabled={completeAppointment.isPending}
                          onClick={() =>
                            completeAppointment.mutate({
                              appointmentId: appointment.id,
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
                              appointmentId: appointment.id,
                              outcome: 'student_no_show',
                            })
                          }
                        >
                          <UserX size={16} /> Falta do aluno
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={completeAppointment.isPending}
                          onClick={() => setOutcomeTargetId(null)}
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : correctionTargetId === appointment.id ? (
                    <div className="mt-4 rounded-2xl bg-[#f4ead2] p-4">
                      <label
                        className="font-semibold"
                        htmlFor={`reason-${appointment.id}`}
                      >
                        Justificativa da correção
                      </label>
                      <textarea
                        id={`reason-${appointment.id}`}
                        className="field mt-2 min-h-24 resize-y bg-white"
                        value={correctionReason}
                        onChange={(event) => setCorrectionReason(event.target.value)}
                        placeholder="Explique por que o resultado precisa ser corrigido."
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          disabled={
                            correctionReason.trim().length < 5 || correctOutcome.isPending
                          }
                          onClick={() =>
                            correctOutcome.mutate({
                              appointmentId: appointment.id,
                              outcome:
                                appointment.status === 'completed'
                                  ? 'student_no_show'
                                  : 'completed',
                            })
                          }
                        >
                          {correctOutcome.isPending && (
                            <LoaderCircle className="animate-spin" size={16} />
                          )}
                          Corrigir para{' '}
                          {appointment.status === 'completed' ? 'falta' : 'realizada'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={correctOutcome.isPending}
                          onClick={() => {
                            setCorrectionTargetId(null)
                            setCorrectionReason('')
                          }}
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#173d2c]/8 pt-4">
                      {appointment.status === 'scheduled' && isFuture && (
                        <>
                          <Button variant="outline" asChild>
                            <Link to={`/app/remarcar/${appointment.id}`}>
                              <CalendarRange size={16} />
                              Remarcar
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setCancelTargetId(appointment.id)}
                          >
                            <XCircle size={16} />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {canComplete && (
                        <Button onClick={() => setOutcomeTargetId(appointment.id)}>
                          <CheckCircle2 size={16} />
                          Registrar resultado
                        </Button>
                      )}
                      {isTrainer && isFinal && (
                        <Button
                          variant="outline"
                          onClick={() => setCorrectionTargetId(appointment.id)}
                        >
                          <PencilLine size={16} />
                          Corrigir resultado
                        </Button>
                      )}
                    </div>
                  )}
                  {cancelAppointment.error && cancelTargetId === appointment.id && (
                    <p className="mt-3 text-sm text-[#8e483a]" role="alert">
                      Não foi possível cancelar esta aula.
                    </p>
                  )}
                  {completeAppointment.error && outcomeTargetId === appointment.id && (
                    <p className="mt-3 text-sm text-[#8e483a]" role="alert">
                      Não foi possível registrar o resultado desta aula.
                    </p>
                  )}
                  {correctOutcome.error && correctionTargetId === appointment.id && (
                    <p className="mt-3 text-sm text-[#8e483a]" role="alert">
                      Não foi possível corrigir o resultado. Confira a justificativa.
                    </p>
                  )}
                  {events && events.length > 0 && (
                    <details className="mt-4 border-t border-[#173d2c]/8 pt-4">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                        <History size={16} /> Histórico
                      </summary>
                      <ol className="mt-2 space-y-2">
                        {events.map((event) => {
                          const correctionReason = getCorrectionReason(event.details)
                          const cancellationReason = getCancellationReason(event.details)
                          const automaticCompletion = isAutomaticCompletion(event.details)
                          return (
                            <li
                              className="rounded-xl bg-[#eef1ea] p-3 text-xs"
                              key={event.id}
                            >
                              <span className="font-semibold">
                                {event.event_type === 'completed'
                                  ? 'Aula realizada'
                                  : event.event_type === 'student_no_show'
                                    ? 'Falta do aluno'
                                    : 'Aula cancelada'}
                              </span>{' '}
                              · {formatEventDate(event.created_at)}
                              {correctionReason && (
                                <span className="mt-1 block text-[#687b71]">
                                  Correção: {correctionReason}
                                </span>
                              )}
                              {cancellationReason && (
                                <span className="mt-1 block text-[#687b71]">
                                  Motivo: {cancellationReason}
                                </span>
                              )}
                              {automaticCompletion && (
                                <span className="mt-1 block text-[#687b71]">
                                  Finalizada automaticamente no término da aula.
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </details>
                  )}
                </motion.article>
              )
            })}
          </AnimatePresence>
          {!appointments.isLoading &&
            !appointments.error &&
            !displayedAppointments?.length && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[2rem] border border-dashed border-[#173d2c]/15 bg-white/50 px-6 py-12 text-center"
              >
                <CalendarCheck className="mx-auto text-[#a47b2e]" size={30} />
                <h2 className="font-display mt-4 text-2xl font-bold">
                  Nenhuma aula agendada.
                </h2>
                <p className="mt-2 text-sm text-[#687b71]">
                  {selectedDay
                    ? 'Não há aulas registradas neste dia.'
                    : 'As próximas aulas aparecerão aqui.'}
                </p>
              </motion.section>
            )}
        </div>
      </div>
    </main>
  )
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
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

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getCorrectionReason(details: Json) {
  if (!details || Array.isArray(details) || typeof details !== 'object') return null
  return details.correction === true && typeof details.reason === 'string'
    ? details.reason
    : null
}

function getCancellationReason(details: Json) {
  if (!details || Array.isArray(details) || typeof details !== 'object') return null
  return typeof details.reason === 'string' && details.reason.trim()
    ? details.reason
    : null
}

function isAutomaticCompletion(details: Json) {
  return Boolean(
    details &&
    !Array.isArray(details) &&
    typeof details === 'object' &&
    details.automatic === true,
  )
}
