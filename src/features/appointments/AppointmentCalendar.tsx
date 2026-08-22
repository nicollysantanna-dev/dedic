import { CalendarDays, X } from 'lucide-react'
import { motion } from 'motion/react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'

import { Button } from '@/components/ui/button'
import type { Tables } from '@/lib/supabase/database.types'

export function AppointmentCalendar({
  appointments,
  selected,
  onSelect,
}: {
  appointments: Tables<'appointments'>[]
  selected?: Date
  onSelect: (date?: Date) => void
}) {
  const scheduled = appointments.filter((item) => item.status === 'scheduled').map(toDate)
  const completed = appointments.filter((item) => item.status === 'completed').map(toDate)
  const noShow = appointments
    .filter((item) => item.status === 'student_no_show')
    .map(toDate)

  return (
    <motion.section
      className="mt-8 overflow-hidden rounded-[2rem] border border-[#173d2c]/8 bg-white/65 p-4 shadow-[0_18px_50px_rgba(28,58,43,0.07)] sm:p-6"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.08 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <CalendarDays size={17} /> Visão mensal
          </p>
          <p className="mt-1 text-xs text-[#718178]">
            Toque em um dia para filtrar as aulas.
          </p>
        </div>
        {selected && (
          <Button variant="ghost" onClick={() => onSelect(undefined)}>
            <X size={16} /> Limpar
          </Button>
        )}
      </div>
      <DayPicker
        animate
        locale={ptBR}
        mode="single"
        selected={selected}
        onSelect={onSelect}
        modifiers={{ scheduled, completed, noShow }}
        modifiersClassNames={{
          scheduled: 'dedic-day-scheduled',
          completed: 'dedic-day-completed',
          noShow: 'dedic-day-no-show',
        }}
        className="dedic-calendar mx-auto"
      />
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#687b71]">
        <Legend color="bg-[#d6a850]" text="Agendada" />
        <Legend color="bg-[#3d7556]" text="Realizada" />
        <Legend color="bg-[#b65f4e]" text="Falta" />
      </div>
    </motion.section>
  )
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {text}
    </span>
  )
}

function toDate(appointment: Tables<'appointments'>) {
  return new Date(appointment.starts_at)
}
