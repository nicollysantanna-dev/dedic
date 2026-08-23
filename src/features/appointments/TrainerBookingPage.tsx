import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CalendarPlus, Clock3, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'

import { PageReveal } from '@/components/ui/motion'
import { getBookingError } from '@/features/appointments/booking-errors'
import { toIsoDate } from '@/features/availability/date-utils'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

type Slot = { slot_start: string; slot_end: string }

export function TrainerBookingPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [manualStart, setManualStart] = useState('')
  const trainerId = profile?.id ?? ''
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
  const today = new Date()
  const rangeEnd = new Date(today)
  rangeEnd.setDate(today.getDate() + 13)
  const slots = useQuery({
    queryKey: ['trainer-booking-slots', trainerId, toIsoDate(today)],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_available_slots', {
        target_trainer_id: trainerId,
        range_start: toIsoDate(today),
        range_end: toIsoDate(rangeEnd),
      })
      if (error) throw error
      return data
    },
  })
  const booking = useMutation({
    mutationFn: async (slot: Slot) => {
      if (!selectedStudent) throw new Error('STUDENT_REQUIRED')
      const { error } = await requireSupabase().rpc('book_appointment_for_student', {
        target_student_id: selectedStudent,
        requested_start: slot.slot_start,
        requested_booking_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trainer-booking-slots'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
    },
  })
  const manualBooking = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('STUDENT_REQUIRED')
      if (!manualStart || new Date(manualStart) <= new Date()) {
        throw new Error('FUTURE_START_REQUIRED')
      }
      const { error } = await requireSupabase().rpc('book_appointment_for_student', {
        target_student_id: selectedStudent,
        requested_start: new Date(manualStart).toISOString(),
        requested_booking_id: crypto.randomUUID(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setManualStart('')
      void queryClient.invalidateQueries({ queryKey: ['trainer-booking-slots'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['agenda-home-appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
    },
  })

  if (profile?.role !== 'trainer') return <Navigate to="/app" replace />

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app"
        >
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>
        <header className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
            Agendamento pelo personal
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            Criar uma aula.
          </h1>
          <p className="mt-3 text-[#60746a]">
            Escolha o aluno e toque no horário. A aula será criada imediatamente e
            consumirá um crédito.
          </p>
        </header>
        <label className="mt-8 block max-w-md text-sm font-semibold">
          Aluno
          <select
            className="field mt-2"
            value={selectedStudent}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {relationships.data?.map((relationship) => (
              <option key={relationship.student_id} value={relationship.student_id}>
                {relationship.profiles?.full_name ?? 'Aluno'}
              </option>
            ))}
          </select>
        </label>
        {relationships.error && (
          <ErrorMessage text="Não foi possível carregar seus alunos." />
        )}
        {!relationships.isLoading && !relationships.data?.length && (
          <EmptyMessage text="Vincule um aluno antes de criar uma aula." />
        )}

        {relationships.data?.length ? (
          <section className="mt-8 rounded-[2rem] bg-[#173d2c] p-6 text-white">
            <CalendarPlus className="text-[#efc86f]" size={24} />
            <h2 className="font-display mt-4 text-2xl font-bold">Escolher data e hora</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9cdc1]">
              Você pode criar uma aula fora da disponibilidade publicada. Conflitos e
              créditos continuam sendo validados automaticamente.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-semibold">
                Início da aula
                <input
                  className="field mt-2 border-white/15 bg-white/10 text-white scheme-dark"
                  type="datetime-local"
                  min={toLocalDateTimeInput(new Date())}
                  value={manualStart}
                  onChange={(event) => setManualStart(event.target.value)}
                />
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d6a850] px-5 text-sm font-bold text-[#173326] disabled:opacity-50"
                type="button"
                disabled={!manualStart || manualBooking.isPending || !selectedStudent}
                onClick={() => manualBooking.mutate()}
              >
                {manualBooking.isPending ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <CalendarPlus size={17} />
                )}
                Criar aula
              </button>
            </div>
            {manualBooking.error && (
              <p className="mt-4 text-sm text-[#f0c3a9]" role="alert">
                {manualBooking.error.message.includes('FUTURE_START_REQUIRED')
                  ? 'Escolha uma data e hora futuras.'
                  : getBookingError(manualBooking.error)}
              </p>
            )}
          </section>
        ) : null}

        <h2 className="font-display mt-9 text-2xl font-bold">Horários publicados</h2>
        {slots.isLoading && (
          <p className="mt-8 text-sm font-semibold">Carregando horários…</p>
        )}
        {slots.error && (
          <ErrorMessage text="Não foi possível carregar sua disponibilidade." />
        )}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {slots.data?.map((slot) => {
            const pending =
              booking.isPending && booking.variables?.slot_start === slot.slot_start
            return (
              <motion.button
                key={slot.slot_start}
                type="button"
                disabled={booking.isPending || !selectedStudent}
                onClick={() => booking.mutate(slot)}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#173d2c]/8 bg-white/60 px-4 text-left transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                {pending ? (
                  <LoaderCircle className="animate-spin text-[#a47b2e]" size={18} />
                ) : (
                  <Clock3 className="text-[#a47b2e]" size={18} />
                )}
                <span>
                  <strong className="block">{formatDay(slot.slot_start)}</strong>
                  <span className="text-xs text-[#718178]">
                    {formatTime(slot.slot_start)}
                  </span>
                </span>
              </motion.button>
            )
          })}
        </div>
        {!slots.isLoading &&
        !slots.error &&
        !slots.data?.length &&
        relationships.data?.length ? (
          <EmptyMessage text="Nenhum horário disponível nos próximos 14 dias." />
        ) : null}
        {booking.error && <ErrorMessage text={getBookingError(booking.error)} />}
      </PageReveal>
    </main>
  )
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]" role="alert">
      {text}
    </p>
  )
}
function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-dashed border-[#173d2c]/15 bg-white/50 px-6 py-10 text-center">
      <CalendarDays className="mx-auto text-[#a47b2e]" />
      <p className="mt-3 text-sm text-[#687b71]">{text}</p>
    </div>
  )
}
function formatDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function toLocalDateTimeInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
