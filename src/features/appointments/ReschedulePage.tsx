import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Clock3, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { getBookingError } from '@/features/appointments/booking-errors'
import { toIsoDate } from '@/features/availability/date-utils'
import { requireSupabase } from '@/lib/supabase/client'

type Slot = { slot_start: string; slot_end: string }

export function ReschedulePage() {
  const { appointmentId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedSlot, setSelectedSlot] = useState<(Slot & { requestId: string }) | null>(
    null,
  )
  const appointment = useQuery({
    queryKey: ['appointment-to-reschedule', appointmentId],
    enabled: Boolean(appointmentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('status', 'scheduled')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const today = new Date()
  const rangeEnd = new Date(today)
  rangeEnd.setDate(today.getDate() + 13)
  const slots = useQuery({
    queryKey: ['reschedule-slots', appointment.data?.trainer_id, toIsoDate(today)],
    enabled: Boolean(appointment.data?.trainer_id),
    queryFn: async () => {
      const trainerId = appointment.data?.trainer_id
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
  const reschedule = useMutation({
    mutationFn: async (slot: Slot & { requestId: string }) => {
      const { data, error } = await requireSupabase().rpc('reschedule_appointment', {
        target_appointment_id: appointmentId,
        requested_start: slot.slot_start,
        requested_reschedule_id: slot.requestId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      void navigate('/app/agenda', { replace: true })
    },
  })

  if (!appointmentId) return <Navigate to="/app/agenda" replace />
  const groupedSlots = groupSlots(slots.data ?? [])

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app/agenda"
        >
          <ArrowLeft size={17} />
          Voltar à agenda
        </Link>
        <header className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
            Trocar horário
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            Remarcar aula.
          </h1>
          {appointment.data && (
            <p className="mt-3 text-[#60746a]">
              Horário atual: {formatDay(appointment.data.starts_at)}, às{' '}
              {formatTime(appointment.data.starts_at)}. Ele só será liberado após a
              confirmação.
            </p>
          )}
        </header>

        {(appointment.isLoading || slots.isLoading) && (
          <p className="mt-10 text-sm font-semibold">Buscando novos horários…</p>
        )}
        {(appointment.error || slots.error) && (
          <p
            className="mt-8 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
            role="alert"
          >
            Não foi possível carregar a remarcação.
          </p>
        )}
        {!appointment.isLoading && !appointment.error && !appointment.data && (
          <p className="mt-8 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]">
            Esta aula não está mais disponível para remarcação.
          </p>
        )}

        <div className="mt-8 space-y-6">
          {groupedSlots.map(([day, daySlots]) => (
            <section key={day}>
              <h2 className="font-display text-2xl font-bold capitalize">
                {formatDay(daySlots[0].slot_start)}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {daySlots.map((slot) => (
                  <button
                    type="button"
                    aria-pressed={selectedSlot?.slot_start === slot.slot_start}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#173d2c]/8 bg-white/60 px-4 text-left aria-pressed:bg-[#e5d3a8]"
                    key={slot.slot_start}
                    onClick={() =>
                      setSelectedSlot({ ...slot, requestId: crypto.randomUUID() })
                    }
                  >
                    <Clock3 className="text-[#a47b2e]" size={18} />
                    <strong>{formatTime(slot.slot_start)}</strong>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!slots.isLoading && appointment.data && !groupedSlots.length && (
            <p className="rounded-[2rem] border border-dashed border-[#173d2c]/15 px-6 py-10 text-center text-sm text-[#687b71]">
              Nenhum novo horário disponível.
            </p>
          )}
        </div>

        {selectedSlot && (
          <section className="sticky bottom-4 mt-8 rounded-[2rem] bg-[#173d2c] p-5 text-white shadow-[0_22px_60px_rgba(24,53,41,0.3)] sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#efc86f]">
                Confirmar troca
              </p>
              <p className="font-display mt-1 text-xl font-bold">
                {formatDay(selectedSlot.slot_start)}, às{' '}
                {formatTime(selectedSlot.slot_start)}
              </p>
              <p className="mt-1 text-xs text-[#b9cdc1]">
                Seu saldo líquido continuará com apenas 1 crédito consumido.
              </p>
            </div>
            <div className="mt-4 flex gap-2 sm:mt-0">
              <Button
                className="bg-[#d6a850] text-[#173326] hover:bg-[#e3bd69]"
                disabled={reschedule.isPending}
                onClick={() => reschedule.mutate(selectedSlot)}
              >
                {reschedule.isPending ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Confirmar troca
              </Button>
              <Button
                className="text-white"
                variant="ghost"
                disabled={reschedule.isPending}
                onClick={() => setSelectedSlot(null)}
              >
                Voltar
              </Button>
            </div>
            {reschedule.error && (
              <p className="mt-3 text-sm text-[#f0c3a9] sm:basis-full" role="alert">
                {getBookingError(reschedule.error)}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function groupSlots(slots: Slot[]) {
  const groups = new Map<string, Slot[]>()
  for (const slot of slots) {
    const day = toIsoDate(new Date(slot.slot_start))
    groups.set(day, [...(groups.get(day) ?? []), slot])
  }
  return Array.from(groups.entries())
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}
