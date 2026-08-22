import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Clock3, LoaderCircle, UserRound } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'

import { PageReveal } from '@/components/ui/motion'
import { getBookingError } from '@/features/appointments/booking-errors'
import { toIsoDate } from '@/features/availability/date-utils'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

type Slot = {
  slot_start: string
  slot_end: string
}

export function StudentCalendarPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const studentId = profile?.id ?? ''

  const relationship = useQuery({
    queryKey: ['calendar-relationship', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'trainer_id, profiles!trainer_student_relationships_trainer_id_fkey(full_name, default_lesson_duration_minutes)',
        )
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const today = new Date()
  const rangeEnd = new Date(today)
  rangeEnd.setDate(today.getDate() + 13)

  const slots = useQuery({
    queryKey: ['available-slots', relationship.data?.trainer_id, toIsoDate(today)],
    enabled: Boolean(relationship.data?.trainer_id),
    queryFn: async () => {
      const trainerId = relationship.data?.trainer_id
      if (!trainerId) return []

      const { data, error } = await requireSupabase().rpc('get_available_slots', {
        target_trainer_id: trainerId,
        range_start: toIsoDate(today),
        range_end: toIsoDate(rangeEnd),
      })
      if (error) throw error
      return data
    },
  })

  const bookAppointment = useMutation({
    mutationFn: async (slot: Slot & { requestId: string }) => {
      const trainerId = relationship.data?.trainer_id
      if (!trainerId) throw new Error('RELATIONSHIP_REQUIRED')

      const { data, error } = await requireSupabase().rpc('book_appointment', {
        target_trainer_id: trainerId,
        requested_start: slot.slot_start,
        requested_booking_id: slot.requestId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] })
    },
  })

  if (profile?.role !== 'student') return <Navigate to="/app" replace />

  const groupedSlots = groupSlotsByDay(slots.data ?? [])

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app"
        >
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>

        <header className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
              Próximos 14 dias
            </p>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
              Horários disponíveis
            </h1>
          </div>
          {relationship.data?.profiles && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3">
              <span className="grid size-10 place-items-center rounded-full bg-[#e3ebe3] text-[#315f47]">
                <UserRound size={18} />
              </span>
              <div>
                <p className="text-xs text-[#718178]">Personal</p>
                <p className="font-semibold">{relationship.data.profiles.full_name}</p>
              </div>
            </div>
          )}
        </header>

        {!relationship.isLoading && !relationship.data && (
          <section className="mt-10 rounded-[2rem] border border-dashed border-[#173d2c]/15 bg-white/50 px-6 py-12 text-center">
            <CalendarDays className="mx-auto text-[#a47b2e]" size={30} />
            <h2 className="font-display mt-4 text-2xl font-bold">
              Você ainda não possui um personal vinculado.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687b71]">
              Aceite um convite no painel para visualizar a disponibilidade.
            </p>
          </section>
        )}

        {relationship.data && slots.isLoading && (
          <p className="mt-10 text-sm font-semibold">Buscando os melhores horários…</p>
        )}

        {slots.error && (
          <p
            className="mt-10 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            Não foi possível carregar os horários. Tente novamente em instantes.
          </p>
        )}

        <div className="mt-9 space-y-6">
          {groupedSlots.map(([dayKey, daySlots]) => (
            <section key={dayKey}>
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-2xl font-bold capitalize tracking-[-0.04em]">
                  {formatDay(daySlots[0].slot_start)}
                </h2>
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#829087]">
                  {daySlots.length} {daySlots.length === 1 ? 'horário' : 'horários'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {daySlots.map((slot) => (
                  <motion.button
                    type="button"
                    key={slot.slot_start}
                    className="group flex min-h-20 items-center gap-3 rounded-2xl border border-[#173d2c]/8 bg-white/60 px-4 text-left transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850] disabled:cursor-wait disabled:opacity-60"
                    disabled={bookAppointment.isPending}
                    aria-busy={
                      bookAppointment.isPending &&
                      bookAppointment.variables?.slot_start === slot.slot_start
                    }
                    onClick={() =>
                      bookAppointment.mutate({
                        ...slot,
                        requestId: crypto.randomUUID(),
                      })
                    }
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {bookAppointment.isPending &&
                    bookAppointment.variables?.slot_start === slot.slot_start ? (
                      <LoaderCircle className="animate-spin text-[#a47b2e]" size={18} />
                    ) : (
                      <Clock3 className="text-[#a47b2e]" size={18} />
                    )}
                    <span>
                      <span className="block font-bold">
                        {formatSlotTime(slot.slot_start)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#718178]">
                        Disponível
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          ))}

          {relationship.data &&
            !slots.isLoading &&
            !slots.error &&
            !groupedSlots.length && (
              <section className="rounded-[2rem] border border-dashed border-[#173d2c]/15 bg-white/50 px-6 py-12 text-center">
                <CalendarDays className="mx-auto text-[#a47b2e]" size={30} />
                <h2 className="font-display mt-4 text-2xl font-bold">
                  Nenhum horário disponível.
                </h2>
                <p className="mt-2 text-sm text-[#687b71]">
                  Seu personal ainda não publicou horários para este período.
                </p>
              </section>
            )}
        </div>

        {bookAppointment.error && (
          <p
            className="mt-6 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            {getBookingError(bookAppointment.error)}
          </p>
        )}
      </PageReveal>
    </main>
  )
}

function groupSlotsByDay(slots: Slot[]) {
  const grouped = new Map<string, Slot[]>()

  for (const slot of slots) {
    const key = toIsoDate(new Date(slot.slot_start))
    const current = grouped.get(key) ?? []
    current.push(slot)
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
