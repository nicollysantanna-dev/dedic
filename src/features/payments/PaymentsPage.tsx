import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  ReceiptText,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { buildFinancialSummary } from '@/features/payments/financial-summary'
import { paymentSchema, type PaymentValues } from '@/features/payments/schemas'
import { appointmentKeys } from '@/features/appointments/keys'
import { paymentKeys } from '@/features/payments/keys'
import { formatCurrency } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

const emptyPayment: PaymentValues = {
  packageId: '',
  amountReais: 500,
  dueOn: new Date().toISOString().slice(0, 10),
  status: 'pending',
  paidOn: '',
}

type DisplayPayment = Tables<'payments'> & { studentName?: string }

export function PaymentsPage() {
  const { profile } = useAuth()
  if (!profile) return null

  return profile.role === 'trainer' ? (
    <TrainerPayments trainerId={profile.id} />
  ) : (
    <StudentPayments studentId={profile.id} />
  )
}

function TrainerPayments({ trainerId }: { trainerId: string }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [paymentId, setPaymentId] = useState<string>(() => crypto.randomUUID())
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: emptyPayment,
  })
  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const packages = useQuery({
    queryKey: ['payment-packages', trainerId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('lesson_packages')
        .select('*, profiles!lesson_packages_student_id_fkey(full_name)')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const payments = usePayments('trainer_id', trainerId)
  const displayPayments: DisplayPayment[] = (payments.data ?? []).map((payment) => ({
    ...payment,
    studentName:
      packages.data?.find((item) => item.id === payment.package_id)?.profiles
        ?.full_name ?? 'Aluno',
  }))
  const summary = buildFinancialSummary(displayPayments)

  const resetForm = () => {
    form.reset(emptyPayment)
    setPaymentId(crypto.randomUUID())
  }

  const savePayment = useMutation({
    mutationFn: async (values: PaymentValues) => {
      const { error } = await requireSupabase().rpc('save_payment', {
        target_payment_id: paymentId,
        target_package_id: values.packageId,
        requested_amount_cents: Math.round(values.amountReais * 100),
        requested_due_on: values.dueOn,
        requested_status: values.status,
        requested_paid_on: values.status === 'paid' ? values.paidOn : undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      resetForm()
      setFormOpen(false)
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
    },
  })

  const editPayment = (payment: Tables<'payments'>) => {
    setPaymentId(payment.id)
    form.reset({
      packageId: payment.package_id,
      amountReais: payment.amount_cents / 100,
      dueOn: payment.due_on,
      status: payment.status,
      paidOn: payment.paid_on ?? '',
    })
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <FinanceShell>
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Receita, cobranças e pendências</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Financeiro
          </h1>
        </div>
        <Button
          onClick={() => {
            if (formOpen) resetForm()
            setFormOpen((open) => !open)
          }}
        >
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? 'Fechar' : 'Registrar pagamento'}
        </Button>
      </header>

      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.section
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5"
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                  <Banknote size={19} />
                </span>
                <div>
                  <h2 className="font-bold">
                    {displayPayments.some((item) => item.id === paymentId)
                      ? 'Atualizar pagamento'
                      : 'Novo pagamento'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    O registro não movimenta dinheiro automaticamente.
                  </p>
                </div>
              </div>
              <form
                className="mt-5 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  void form.handleSubmit((values) => savePayment.mutate(values))(event)
                }}
              >
                <label className="text-sm font-semibold sm:col-span-2">
                  Pacote e aluno
                  <select
                    className="field field-dark mt-2"
                    {...form.register('packageId')}
                  >
                    <option className="text-slate-950" value="">
                      Selecione
                    </option>
                    {packages.data?.map((item) => (
                      <option className="text-slate-950" key={item.id} value={item.id}>
                        {item.profiles?.full_name ?? 'Aluno'} · {item.lesson_count} aulas
                      </option>
                    ))}
                  </select>
                  <ErrorText text={form.formState.errors.packageId?.message} />
                </label>
                <label className="text-sm font-semibold">
                  Valor (R$)
                  <input
                    className="field field-dark mt-2"
                    step="0.01"
                    type="number"
                    {...form.register('amountReais', { valueAsNumber: true })}
                  />
                  <ErrorText text={form.formState.errors.amountReais?.message} />
                </label>
                <label className="text-sm font-semibold">
                  Vencimento
                  <input
                    className="field field-dark mt-2"
                    type="date"
                    {...form.register('dueOn')}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Situação
                  <select className="field field-dark mt-2" {...form.register('status')}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option className="text-slate-950" key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedStatus === 'paid' && (
                  <label className="text-sm font-semibold">
                    Data do pagamento
                    <input
                      className="field field-dark mt-2"
                      type="date"
                      {...form.register('paidOn')}
                    />
                    <ErrorText text={form.formState.errors.paidOn?.message} />
                  </label>
                )}
                {savePayment.error && (
                  <p className="text-sm text-red-200 sm:col-span-2" role="alert">
                    Não foi possível salvar o pagamento.
                  </p>
                )}
                <div className="flex gap-2 sm:col-span-2">
                  <Button disabled={savePayment.isPending} type="submit">
                    {savePayment.isPending && (
                      <LoaderCircle className="animate-spin" size={17} />
                    )}
                    Salvar pagamento
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Limpar
                  </Button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {payments.isLoading && <LoadingState />}
      {payments.error && <PageError />}
      {!payments.isLoading && !payments.error && (
        <>
          <FinancialMetrics summary={summary} />
          <RevenueChart data={summary.monthlyRevenue} />
          <PaymentsTable payments={displayPayments} onEdit={editPayment} />
        </>
      )}
    </FinanceShell>
  )
}

function StudentPayments({ studentId }: { studentId: string }) {
  const payments = usePayments('student_id', studentId)
  const summary = buildFinancialSummary(payments.data ?? [])

  return (
    <FinanceShell>
      <header>
        <p className="text-sm text-slate-400">Vencimentos e pagamentos registrados</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
          Financeiro
        </h1>
      </header>
      {payments.isLoading && <LoadingState />}
      {payments.error && <PageError />}
      {!payments.isLoading && !payments.error && (
        <>
          <FinancialMetrics summary={summary} compact />
          <PaymentsTable payments={payments.data ?? []} />
        </>
      )}
    </FinanceShell>
  )
}

function usePayments(column: 'trainer_id' | 'student_id', userId: string) {
  return useQuery({
    queryKey: paymentKeys.list(column, userId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('payments')
        .select('*')
        .eq(column, userId)
        .order('due_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function FinancialMetrics({
  summary,
  compact = false,
}: {
  summary: ReturnType<typeof buildFinancialSummary>
  compact?: boolean
}) {
  const metrics = compact
    ? [
        {
          label: 'Pago neste mês',
          value: formatCurrency(summary.receivedCents),
          detail: 'Pagamentos recebidos no mês',
          icon: CircleCheck,
        },
        {
          label: 'A pagar',
          value: formatCurrency(summary.pendingCents + summary.overdueCents),
          detail: 'Pendentes e atrasados',
          icon: WalletCards,
        },
      ]
    : [
        {
          label: 'Receita do mês',
          value: formatCurrency(summary.receivedCents),
          detail: 'Pagamentos recebidos no mês',
          icon: TrendingUp,
        },
        {
          label: 'A receber',
          value: formatCurrency(summary.pendingCents),
          detail: 'Pendente de cobrança',
          icon: WalletCards,
        },
        {
          label: 'Inadimplência',
          value: formatCurrency(summary.overdueCents),
          detail: 'Pagamentos atrasados',
          icon: CircleAlert,
        },
        {
          label: 'Alunos pagos',
          value: `${summary.paidStudents} / ${summary.totalStudents}`,
          detail: 'Sem pendências abertas',
          icon: UsersRound,
        },
      ]

  return (
    <section
      className={cn(
        'mt-6 grid gap-3',
        compact ? 'sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4',
      )}
      aria-label="Indicadores financeiros"
    >
      {metrics.map(({ label, value, detail, icon: Icon }, index) => (
        <motion.article
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.25rem] bg-white p-4 text-slate-950 sm:p-5"
          initial={{ opacity: 0, y: 8 }}
          key={label}
          transition={{ delay: index * 0.04 }}
        >
          <Icon className="text-blue-600" size={19} />
          <p className="mt-4 text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-[-0.03em]">{value}</p>
          <p className="mt-1 text-[0.7rem] text-slate-400">{detail}</p>
        </motion.article>
      ))}
    </section>
  )
}

function RevenueChart({
  data,
}: {
  data: ReturnType<typeof buildFinancialSummary>['monthlyRevenue']
}) {
  const max = Math.max(...data.map((item) => item.amountCents), 1)
  return (
    <section className="mt-5 rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold">Evolução da receita</h2>
          <p className="mt-1 text-xs text-slate-500">Últimos seis meses recebidos</p>
        </div>
        <TrendingUp className="text-blue-600" size={20} />
      </div>
      <div className="mt-8 grid h-52 grid-cols-6 items-end gap-2 sm:gap-5">
        {data.map((item, index) => (
          <div className="flex h-full flex-col justify-end text-center" key={item.key}>
            <span className="mb-2 hidden text-[0.65rem] font-medium text-slate-500 sm:block">
              {item.amountCents ? formatCompactCurrency(item.amountCents) : '—'}
            </span>
            <motion.span
              animate={{ height: `${Math.max(4, (item.amountCents / max) * 100)}%` }}
              className={cn(
                'mx-auto block w-full max-w-12 rounded-t-lg bg-blue-300',
                index === data.length - 1 && 'bg-blue-600',
              )}
              initial={{ height: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 120 }}
            />
            <span className="mt-2 text-[0.65rem] font-semibold capitalize text-slate-500">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function PaymentsTable({
  payments,
  onEdit,
}: {
  payments: DisplayPayment[]
  onEdit?: (payment: Tables<'payments'>) => void
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-[1.5rem] bg-white text-slate-950">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <h2 className="font-bold">Movimentações recentes</h2>
        <p className="mt-1 text-xs text-slate-500">Histórico financeiro registrado</p>
      </div>
      <div className="hidden grid-cols-[0.8fr_1.2fr_1fr_0.8fr_auto] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 md:grid">
        <span>Vencimento</span>
        <span>Aluno</span>
        <span>Valor</span>
        <span>Situação</span>
        <span className="sr-only">Ações</span>
      </div>
      <div className="divide-y divide-slate-100">
        {payments.map((payment) => (
          <article
            className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[0.8fr_1.2fr_1fr_0.8fr_auto] md:items-center"
            key={payment.id}
          >
            <span className="text-slate-500">{formatDate(payment.due_on)}</span>
            <span className="font-semibold">{payment.studentName ?? 'Seu pacote'}</span>
            <strong>{formatCurrency(payment.amount_cents)}</strong>
            <StatusBadge status={payment.status} />
            {onEdit ? (
              <button
                className="relative z-10 inline-flex min-h-9 items-center gap-1.5 justify-self-start rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                onClick={() => onEdit(payment)}
                type="button"
              >
                <PencilLine size={14} /> Editar
              </button>
            ) : (
              <span />
            )}
          </article>
        ))}
        {!payments.length && (
          <div className="px-6 py-14 text-center">
            <ReceiptText className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 text-sm text-slate-500">Nenhum pagamento registrado.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: Tables<'payments'>['status'] }) {
  return (
    <span
      className={cn(
        'w-fit rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'paid' && 'bg-emerald-100 text-emerald-700',
        status === 'pending' && 'bg-amber-100 text-amber-700',
        status === 'overdue' && 'bg-red-100 text-red-700',
        status === 'cancelled' && 'bg-slate-100 text-slate-500',
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

function FinanceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  )
}

function LoadingState() {
  return (
    <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
      Carregando financeiro…
    </p>
  )
}

function ErrorText({ text }: { text?: string }) {
  return text ? <span className="mt-1 block text-xs text-red-200">{text}</span> : null
}

function PageError() {
  return (
    <p
      className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
      role="alert"
    >
      Não foi possível carregar os pagamentos.
    </p>
  )
}

const statusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

const formatCompactCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
