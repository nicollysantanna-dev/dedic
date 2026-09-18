import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  Plus,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { getAppointmentStatusLabel } from '@/features/appointments/appointment-status'
import { useAuth } from '@/features/auth/auth-context'
import { buildFinancialSummary } from '@/features/payments/financial-summary'
import { appointmentKeys } from '@/features/appointments/keys'
import { paymentKeys } from '@/features/payments/keys'
import { daysUntil } from '@/features/progress/progress-summary'
import { buildStudentOverviews } from '@/features/students/student-overview'
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatLongDate,
  formatTime,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { requireSupabase } from '@/lib/supabase/client'

export function TrainerHomePage() {
  const { profile } = useAuth()
  const trainerId = profile?.id ?? ''
  const today = dayRange(new Date())

  const appointments = useQuery({
    queryKey: appointmentKeys.trainerToday(trainerId, today.start.toISOString()),
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select(
          'id, starts_at, ends_at, status, student_id, profiles!appointments_student_id_fkey(full_name)',
        )
        .eq('trainer_id', trainerId)
        .gte('starts_at', today.start.toISOString())
        .lt('starts_at', today.end.toISOString())
        .order('starts_at')
      if (error) throw error
      return data
    },
  })

  const students = useQuery({
    queryKey: appointmentKeys.studentOverviews(trainerId),
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('student_activity_summary')
        .select('*')
        .eq('trainer_id', trainerId)
      if (error) throw error
      return buildStudentOverviews(data)
    },
  })

  const upcoming = useQuery({
    queryKey: appointmentKeys.upcoming(trainerId),
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select('id, starts_at, status, profiles!appointments_student_id_fkey(full_name)')
        .eq('trainer_id', trainerId)
        .eq('status', 'scheduled')
        .gte('starts_at', today.end.toISOString())
        .order('starts_at')
        .limit(5)
      if (error) throw error
      return data
    },
  })

  const payments = useQuery({
    queryKey: paymentKeys.trainerSummary(trainerId),
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('payments')
        .select('student_id, amount_cents, status, due_on, paid_on')
        .eq('trainer_id', trainerId)
        .in('status', ['pending', 'overdue', 'paid'])
      if (error) throw error
      return data
    },
  })

  const todayAppointments = appointments.data ?? []
  const overviews = students.data ?? []
  const attentionStudents = overviews.filter((student) => student.needsAttention)
  const averageAttendance = (() => {
    const rated = overviews.filter((student) => student.attendance !== null)
    if (!rated.length) return null
    return Math.round(
      rated.reduce((total, student) => total + (student.attendance ?? 0), 0) /
        rated.length,
    )
  })()
  const renewals = overviews
    .filter((student) => student.renewalDate && daysUntil(student.renewalDate) <= 14)
    .sort((left, right) => left.renewalDate!.localeCompare(right.renewalDate!))
  const pendingPayments = (payments.data ?? []).filter((item) => item.status !== 'paid')
  const monthRevenue = buildFinancialSummary(payments.data ?? []).receivedCents
  const hasError = appointments.error || students.error || payments.error

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{formatLongDate(new Date())}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              {getGreeting()}, {profile?.full_name.split(' ')[0]}.
            </h1>
          </div>
          <Button asChild>
            <Link to="/app/agenda?novo=1">
              <Plus size={17} /> Nova aula
            </Link>
          </Button>
        </header>

        {hasError && (
          <p
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar todos os dados do dashboard.
          </p>
        )}

        <section className="mt-6 rounded-[1.5rem] bg-white p-5 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="text-[var(--brand)]" size={19} /> Agenda de hoje
            </h2>
            <Link className="text-xs font-semibold text-[var(--brand)]" to="/app/agenda">
              Ver agenda completa
            </Link>
          </div>

          {appointments.isLoading && (
            <p className="py-10 text-center text-sm text-slate-500">Carregando aulas…</p>
          )}
          {!appointments.isLoading && !todayAppointments.length && (
            <div className="py-10 text-center">
              <CalendarDays className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 font-semibold">Nenhuma aula marcada para hoje.</p>
              <p className="mt-1 text-sm text-slate-500">
                Use este tempo para organizar a próxima semana.
              </p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {todayAppointments.map((appointment, index) => (
              <motion.article
                className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.045 }}
                key={appointment.id}
              >
                <strong className="text-sm">{formatTime(appointment.starts_at)}</strong>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {appointment.profiles?.full_name ?? 'Aluno'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 size={12} /> {formatTime(appointment.starts_at)}–
                    {formatTime(appointment.ends_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  <Link
                    aria-label={`Abrir aula de ${appointment.profiles?.full_name ?? 'aluno'} na agenda`}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
                    to={`/app/agenda?aula=${appointment.id}`}
                  >
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label="Indicadores"
        >
          <MetricCard
            icon={CalendarDays}
            label="Aulas hoje"
            value={String(todayAppointments.length)}
            detail={`${todayAppointments.filter((item) => item.status === 'completed').length} realizadas`}
          />
          <MetricCard
            icon={UsersRound}
            label="Alunos ativos"
            value={String(overviews.length)}
            detail={`${attentionStudents.length} precisam de atenção`}
          />
          <MetricCard
            icon={TrendingUp}
            label="Frequência"
            value={averageAttendance === null ? '—' : `${averageAttendance}%`}
            detail="Média dos alunos ativos"
          />
          <MetricCard
            icon={WalletCards}
            label="Receita do mês"
            value={formatCurrency(monthRevenue)}
            detail={`${pendingPayments.length} pendência(s)`}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Tarefas e alertas</h2>
              <CircleAlert className="text-amber-500" size={19} />
            </div>
            <div className="mt-4 space-y-2">
              {pendingPayments.slice(0, 4).map((payment, index) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                  key={`${payment.due_on}-${index}`}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      Pagamento {payment.status === 'overdue' ? 'atrasado' : 'pendente'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Vencimento em {formatDateOnly(payment.due_on)}
                    </p>
                  </div>
                  <strong className="text-sm">
                    {formatCurrency(payment.amount_cents)}
                  </strong>
                </div>
              ))}
              {!pendingPayments.length && (
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                  Nenhuma pendência financeira encontrada.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Alunos que precisam de atenção</h2>
              <Link
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]"
                to="/app/alunos"
              >
                Ver alunos <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {attentionStudents.slice(0, 5).map((student) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                  key={student.studentId}
                  to={`/app/alunos/${student.studentId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {student.alerts.map((alert) => alert.label).join(' · ')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold',
                      student.alerts.some((alert) => alert.severity === 'high')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {student.alerts.length}
                  </span>
                </Link>
              ))}
              {students.isLoading && (
                <p className="py-4 text-center text-sm text-slate-500">Carregando…</p>
              )}
              {!students.isLoading && !attentionStudents.length && (
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                  Todos os alunos estão em dia.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
            <h2 className="font-bold">Próximas aulas</h2>
            <div className="mt-4 space-y-2">
              {(upcoming.data ?? []).map((appointment) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                  key={appointment.id}
                  to={`/app/agenda?aula=${appointment.id}`}
                >
                  <p className="truncate text-sm font-semibold">
                    {appointment.profiles?.full_name ?? 'Aluno'}
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDateTime(appointment.starts_at)}
                  </span>
                </Link>
              ))}
              {!upcoming.isLoading && !upcoming.data?.length && (
                <p className="py-4 text-center text-sm text-slate-500">
                  Nenhuma aula marcada após hoje.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
            <h2 className="font-bold">Renovações próximas</h2>
            <div className="mt-4 space-y-2">
              {renewals.slice(0, 5).map((student) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                  key={student.studentId}
                  to={`/app/alunos/${student.studentId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {student.balance} crédito{student.balance === 1 ? '' : 's'} restante
                      {student.balance === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDateOnly(student.renewalDate!)}
                  </span>
                </Link>
              ))}
              {!students.isLoading && !renewals.length && (
                <p className="py-4 text-center text-sm text-slate-500">
                  Nenhuma renovação nos próximos 14 dias.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
  detail: string
}) {
  return (
    <motion.article
      className="rounded-2xl bg-white p-4 text-slate-950 sm:p-5"
      whileHover={{ y: -3 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="text-[var(--brand)]" size={17} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </motion.article>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'student_no_show'
        ? 'bg-red-100 text-red-700'
        : 'bg-blue-100 text-blue-700'
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${style}`}>
      {getAppointmentStatusLabel(
        status as Parameters<typeof getAppointmentStatusLabel>[0],
      )}
    </span>
  )
}

function dayRange(value: Date) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function getGreeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
