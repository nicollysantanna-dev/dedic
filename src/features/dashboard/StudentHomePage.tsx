import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Dumbbell,
  TrendingUp,
  Target,
  UserRound,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { buildStudentHomeSummary } from '@/features/dashboard/student-home-summary'
import { appointmentKeys } from '@/features/appointments/keys'
import { creditKeys } from '@/features/credits/keys'
import { paymentKeys } from '@/features/payments/keys'
import {
  formatCurrency,
  formatDateOnly,
  formatLongDate,
  formatTime,
  initials,
} from '@/lib/format'
import { requireSupabase } from '@/lib/supabase/client'

export function StudentHomePage() {
  const { profile, invitationClaimStatus } = useAuth()
  const studentId = profile?.id ?? ''

  const relationship = useQuery({
    queryKey: ['student-home-relationship', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'trainer_id, profiles!trainer_student_relationships_trainer_id_fkey(full_name, phone)',
        )
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const appointments = useQuery({
    queryKey: appointmentKeys.studentHistory(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select('id, starts_at, ends_at, status, package_id')
        .eq('student_id', studentId)
        .order('starts_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const activePackage = useQuery({
    queryKey: creditKeys.activePackage(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('lesson_packages')
        .select('id, lesson_count, expires_on, status')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const balance = useQuery({
    queryKey: creditKeys.balance(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: studentId,
      })
      if (error) throw error
      return data
    },
  })
  const payment = useQuery({
    queryKey: paymentKeys.next(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('payments')
        .select('amount_cents, due_on, status')
        .eq('student_id', studentId)
        .in('status', ['pending', 'overdue'])
        .order('due_on')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const summary = buildStudentHomeSummary({
    appointments: appointments.data ?? [],
    activePackageId: activePackage.data?.id ?? null,
    balance: balance.data ?? 0,
  })
  const nextAppointment = (appointments.data ?? []).find(
    (item) => item.status === 'scheduled' && item.starts_at === summary.nextAppointment,
  )
  const loading =
    relationship.isLoading ||
    appointments.isLoading ||
    activePackage.isLoading ||
    balance.isLoading ||
    payment.isLoading
  const error =
    relationship.error ||
    appointments.error ||
    activePackage.error ||
    balance.error ||
    payment.error

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm capitalize text-slate-400">
            {formatLongDate(new Date())}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Olá, {profile?.full_name.split(' ')[0]}.
          </h1>
        </header>

        {invitationClaimStatus === 'success' && (
          <p
            className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"
            role="status"
          >
            <CheckCircle2 className="shrink-0" size={19} />
            Vínculo criado. Seu personal e sua agenda já estão disponíveis.
          </p>
        )}
        {invitationClaimStatus === 'error' && (
          <p
            className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"
            role="alert"
          >
            <CircleAlert className="shrink-0" size={19} />
            Não foi possível ativar este convite. Confirme se ele ainda é válido e se foi
            enviado para o contato desta conta.
          </p>
        )}

        {loading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Preparando seu resumo…
          </p>
        )}
        {error && (
          <p
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar todo o seu resumo.
          </p>
        )}

        {!loading && !error && !relationship.data && (
          <section className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center">
            <UserRound className="mx-auto text-blue-400" size={32} />
            <h2 className="mt-4 text-xl font-bold">Aguardando vínculo com o personal.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Entre com o mesmo e-mail do convite ou use o link privado enviado pelo seu
              personal.
            </p>
          </section>
        )}

        {!loading && !error && relationship.data && (
          <>
            <section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[1.5rem] bg-[var(--brand)] p-5 sm:p-7"
                initial={{ opacity: 0, y: 10 }}
              >
                <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/10" />
                <div className="absolute -right-8 -top-12 size-44 rounded-full border border-white/10" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">
                      Próxima aula
                    </p>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                      {nextAppointment ? 'Agendada' : 'Sem agendamento'}
                    </span>
                  </div>
                  {nextAppointment ? (
                    <>
                      <h2 className="mt-5 text-2xl font-bold capitalize sm:text-3xl">
                        {formatAppointmentDay(nextAppointment.starts_at)}
                      </h2>
                      <p className="mt-3 flex items-center gap-2 text-blue-50">
                        <Clock3 size={18} /> {formatTime(nextAppointment.starts_at)}–
                        {formatTime(nextAppointment.ends_at)}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-blue-100">
                        <UserRound size={16} /> com{' '}
                        {relationship.data.profiles?.full_name ?? 'seu personal'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-5 text-2xl font-bold">Sua agenda está livre.</h2>
                      <p className="mt-2 text-sm text-blue-100">
                        Escolha um horário publicado pelo seu personal.
                      </p>
                    </>
                  )}
                  <div className="mt-7 flex flex-wrap gap-2">
                    <Button asChild className="bg-white text-blue-700 hover:bg-blue-50">
                      <Link to="/app/agenda">
                        <CalendarDays size={17} /> Agendar aula
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                    >
                      <Link to="/app/agenda">
                        Ver agenda <ArrowRight size={16} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.article>

              <aside className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
                <span className="grid size-11 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {initials(relationship.data.profiles?.full_name ?? 'Personal')}
                </span>
                <p className="mt-4 text-xs text-slate-500">Seu personal</p>
                <h2 className="mt-1 text-lg font-bold">
                  {relationship.data.profiles?.full_name ?? 'Personal vinculado'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {relationship.data.profiles?.phone ?? 'Contato não informado'}
                </p>
                <Link
                  className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-700"
                  to="/app/alunos"
                >
                  Ver vínculo <ArrowRight size={15} />
                </Link>
              </aside>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                icon={CreditCard}
                label="Créditos disponíveis"
                value={String(summary.balance)}
                detail="Sem vencimento"
              />
              <SummaryCard
                icon={CalendarCheck}
                label="Aulas utilizadas"
                value={`${summary.packageUsed} / ${activePackage.data?.lesson_count ?? 0}`}
                detail="Pacote atual"
              />
              <SummaryCard
                icon={Target}
                label="Frequência"
                value={summary.attendance === null ? '—' : `${summary.attendance}%`}
                detail="Realizadas sobre concluídas"
              />
              <SummaryCard
                icon={CircleDollarSign}
                label="Pagamento"
                value={paymentStatusLabel(payment.data?.status)}
                detail={
                  payment.data
                    ? `${formatCurrency(payment.data.amount_cents)} · ${formatDateOnly(payment.data.due_on)}`
                    : activePackage.data
                      ? `Renovação ${formatDateOnly(activePackage.data.expires_on)}`
                      : 'Sem pacote ativo'
                }
              />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:p-6">
                <h2 className="font-bold">Atalhos</h2>
                <div className="mt-4 space-y-2">
                  <Shortcut to="/app/agenda" icon={CalendarDays} label="Minhas aulas" />
                  <Shortcut to="/app/treinos" icon={Dumbbell} label="Meus treinos" />
                  <Shortcut
                    to="/app/creditos"
                    icon={CreditCard}
                    label="Créditos e extrato"
                  />
                  <Shortcut
                    to="/app/financeiro"
                    icon={CircleDollarSign}
                    label="Pagamentos"
                  />
                  <Shortcut to="/app/evolucao" icon={TrendingUp} label="Minha evolução" />
                  <Shortcut to="/app/personal" icon={UserRound} label="Meu personal" />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function SummaryCard({
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
    <article className="rounded-[1.25rem] bg-white p-4 text-slate-950 sm:p-5">
      <Icon className="text-blue-600" size={19} />
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-1 text-[0.7rem] text-slate-400">{detail}</p>
    </article>
  )
}

function Shortcut({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof CalendarDays
  label: string
}) {
  return (
    <Link
      className="flex min-h-12 items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
      to={to}
    >
      <span className="flex items-center gap-2">
        <Icon size={16} className="text-blue-400" /> {label}
      </span>
      <ArrowRight size={15} />
    </Link>
  )
}

function paymentStatusLabel(status?: 'pending' | 'overdue' | 'paid' | 'cancelled') {
  if (status === 'overdue') return 'Atrasado'
  if (status === 'pending') return 'Pendente'
  return 'Em dia'
}

function formatAppointmentDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value))
}
