import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Clock3, LoaderCircle } from 'lucide-react'
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
