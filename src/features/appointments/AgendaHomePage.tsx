import { useQuery } from '@tanstack/react-query'
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  ReceiptText,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import { AppointmentCalendar } from '@/features/appointments/AppointmentCalendar'
import { getAppointmentStatusLabel } from '@/features/appointments/appointment-status'
import { toIsoDate } from '@/features/availability/date-utils'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

export function AgendaHomePage() {
  const { profile, signOut } = useAuth()
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedStudentId, setSelectedStudentId] = useState('all')
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
          <ActionLink to="/app/resumo" icon={LayoutDashboard} label="Gestão" />
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
            onSelect={(date) => date && setSelectedDay(date)}
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
                <Link
                  className="block rounded-2xl bg-white/10 p-4 transition hover:bg-white/15"
                  key={appointment.id}
                  to="/app/agenda"
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
                </Link>
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
                  <span
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs"
                    key={slot.slot_start}
                  >
                    {formatTime(slot.slot_start)}
                  </span>
                ))}
              </div>
              <Button className="mt-4 w-full bg-[#d6a850] text-[#173326]" asChild>
                <Link to={isTrainer ? '/app/criar-aula' : '/app/calendario'}>
                  <CalendarPlus size={16} />
                  {isTrainer ? 'Agendar para aluno' : 'Escolher horário'}
                </Link>
              </Button>
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
      </PageReveal>
    </main>
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
