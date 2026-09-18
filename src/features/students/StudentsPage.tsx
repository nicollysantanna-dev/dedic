import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  Plus,
  Search,
  UsersRound,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  buildStudentOverviews,
  type StudentOverview,
} from '@/features/students/student-overview'
import { appointmentKeys } from '@/features/appointments/keys'
import { initials } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type StudentFilter = 'all' | 'attention' | 'noCredits'

export function StudentsPage() {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StudentFilter>('all')
  const trainerId = profile?.id ?? ''

  const students = useQuery({
    queryKey: appointmentKeys.studentOverviews(trainerId),
    enabled: Boolean(trainerId) && profile?.role === 'trainer',
    queryFn: async () => {
      const { data: relationships, error: relationshipError } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'id, student_id, profiles!trainer_student_relationships_student_id_fkey(full_name, phone)',
        )
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
      if (relationshipError) throw relationshipError
      if (!relationships.length) return []

      const studentIds = relationships.map((item) => item.student_id)
      const [appointments, packages, payments, credits] = await Promise.all([
        requireSupabase()
          .from('appointments')
          .select('student_id, starts_at, status')
          .eq('trainer_id', trainerId)
          .in('student_id', studentIds),
        requireSupabase()
          .from('lesson_packages')
          .select('student_id, status, expires_on, lesson_count')
          .eq('trainer_id', trainerId)
          .in('student_id', studentIds),
        requireSupabase()
          .from('payments')
          .select('student_id, status, due_on')
          .eq('trainer_id', trainerId)
          .in('student_id', studentIds),
        requireSupabase()
          .from('credit_transactions')
          .select('student_id, amount')
          .eq('trainer_id', trainerId)
          .in('student_id', studentIds),
      ])
      const error =
        appointments.error || packages.error || payments.error || credits.error
      if (error) throw error

      return buildStudentOverviews({
        relationships,
        appointments: appointments.data,
        packages: packages.data,
        payments: payments.data,
        credits: credits.data,
      })
    },
  })

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (students.data ?? []).filter((student) => {
      const matchesSearch = student.name.toLocaleLowerCase('pt-BR').includes(term)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'attention' && student.needsAttention) ||
        (filter === 'noCredits' && student.balance <= 0)
      return matchesSearch && matchesFilter
    })
  }, [filter, search, students.data])

  if (profile?.role !== 'trainer') return <Navigate to="/app/personal" replace />

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Relacionamento e acompanhamento</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Alunos
            </h1>
          </div>
          <Button asChild>
            <Link to="/app/alunos/convidar">
              <Plus size={17} /> <span className="hidden sm:inline">Novo aluno</span>
              <span className="sm:hidden">Adicionar</span>
            </Link>
          </Button>
        </header>

        <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <span className="sr-only">Buscar aluno</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar aluno..."
              type="search"
              value={search}
            />
          </label>
          <div
            className="grid grid-cols-3 rounded-xl border border-white/8 bg-white/4 p-1"
            aria-label="Filtrar alunos"
          >
            {(
              [
                ['all', 'Todos'],
                ['attention', 'Atenção'],
                ['noCredits', 'Sem créditos'],
              ] as const
            ).map(([value, label]) => (
              <button
                className={cn(
                  'min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-400 transition',
                  filter === value && 'bg-[var(--brand)] text-white',
                )}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
                aria-pressed={filter === value}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {students.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando alunos…
          </p>
        )}
        {students.error && (
          <p
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar seus alunos.
          </p>
        )}

        {!students.isLoading && !students.error && (
          <section className="mt-6 overflow-hidden rounded-[1.5rem] bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
            <div className="hidden grid-cols-[minmax(12rem,1.5fr)_0.8fr_0.8fr_1fr_1fr_auto] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 lg:grid">
              <span>Aluno</span>
              <span>Frequência</span>
              <span>Créditos</span>
              <span>Próxima aula</span>
              <span>Financeiro</span>
              <span className="sr-only">Abrir</span>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleStudents.map((student, index) => (
                <StudentRow index={index} key={student.studentId} student={student} />
              ))}
            </div>
            {!visibleStudents.length && (
              <div className="px-6 py-14 text-center">
                <UsersRound className="mx-auto text-slate-300" size={32} />
                <h2 className="mt-4 font-bold">Nenhum aluno encontrado.</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {students.data?.length
                    ? 'Tente outro nome ou filtro.'
                    : 'Adicione seu primeiro aluno para começar.'}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function StudentRow({ student, index }: { student: StudentOverview; index: number }) {
  return (
    <motion.article
      className="relative grid gap-4 px-4 py-5 lg:grid-cols-[minmax(12rem,1.5fr)_0.8fr_0.8fr_1fr_1fr_auto] lg:items-center lg:px-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
          {initials(student.name)}
        </span>
        <div className="min-w-0">
          <Link
            className="after:absolute after:inset-0 truncate font-semibold hover:text-blue-700"
            to={`/app/alunos/${student.studentId}`}
          >
            {student.name}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            {student.phone ?? 'Vínculo ativo'}
          </p>
        </div>
        {student.needsAttention && (
          <span
            className="ml-auto grid size-8 place-items-center rounded-full bg-amber-100 text-amber-700 lg:hidden"
            title="Precisa de atenção"
          >
            <AlertCircle size={16} />
          </span>
        )}
      </div>

      <Metric label="Frequência">
        <div className="flex items-center gap-2">
          <strong>{student.attendance === null ? '—' : `${student.attendance}%`}</strong>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-blue-600"
              style={{ width: `${student.attendance ?? 0}%` }}
            />
          </span>
        </div>
      </Metric>
      <Metric label="Créditos">
        <strong className={student.balance <= 1 ? 'text-amber-600' : ''}>
          {student.balance} aula{student.balance === 1 ? '' : 's'}
        </strong>
      </Metric>
      <Metric label="Próxima aula">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock size={14} className="text-slate-400" />
          {student.nextAppointment
            ? formatAppointment(student.nextAppointment)
            : 'Não marcada'}
        </span>
      </Metric>
      <Metric label="Financeiro">
        <PaymentBadge status={student.paymentStatus} />
      </Metric>
      <ChevronRight className="hidden text-slate-300 lg:block" size={18} />
    </motion.article>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] text-sm lg:block">
      <span className="text-xs font-medium text-slate-400 lg:hidden">{label}</span>
      <div>{children}</div>
    </div>
  )
}

function PaymentBadge({ status }: { status: StudentOverview['paymentStatus'] }) {
  if (!status) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Em dia
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
      )}
    >
      {status === 'overdue' ? 'Atrasado' : 'Pendente'}
    </span>
  )
}

function formatAppointment(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
