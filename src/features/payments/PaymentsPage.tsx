import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Banknote, LoaderCircle, PencilLine, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import { useAuth } from '@/features/auth/auth-context'
import { paymentSchema, type PaymentValues } from '@/features/payments/schemas'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

const emptyPayment: PaymentValues = {
  packageId: '',
  amountReais: 500,
  dueOn: new Date().toISOString().slice(0, 10),
  status: 'pending',
  paidOn: '',
}

export function PaymentsPage() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <PageShell>
      {profile.role === 'trainer' ? (
        <TrainerPayments trainerId={profile.id} />
      ) : (
        <PaymentList studentId={profile.id} />
      )}
    </PageShell>
  )
}

function TrainerPayments({ trainerId }: { trainerId: string }) {
  const queryClient = useQueryClient()
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
  const savePayment = useMutation({
    mutationFn: async (values: PaymentValues) => {
      const { error } = await requireSupabase().rpc('save_payment', {
        target_payment_id: paymentId,
        target_package_id: values.packageId,
        requested_amount_cents: Math.round(values.amountReais * 100),
        requested_due_on: values.dueOn,
        requested_status: values.status,
        requested_paid_on: values.status === 'paid' ? values.paidOn : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      form.reset(emptyPayment)
      setPaymentId(crypto.randomUUID())
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-payments'] })
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Header
        eyebrow="Financeiro manual"
        title="Pagamentos sem mistério."
        description="Registre a situação financeira sem movimentar dinheiro ou créditos automaticamente."
      />
      <section className="mt-8 rounded-[2rem] bg-[#173d2c] p-6 text-white sm:p-7">
        <Banknote className="text-[#efc86f]" size={25} />
        <h2 className="font-display mt-4 text-2xl font-bold">
          {payments.data?.some((item) => item.id === paymentId)
            ? 'Atualizar pagamento'
            : 'Registrar pagamento'}
        </h2>
        <form
          className="mt-6 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            void form.handleSubmit((values) => savePayment.mutate(values))(event)
          }}
        >
          <label className="text-sm font-semibold sm:col-span-2">
            Pacote e aluno
            <select
              className="field mt-2 border-white/15 bg-white/10 text-white"
              {...form.register('packageId')}
            >
              <option className="text-[#183529]" value="">
                Selecione
              </option>
              {packages.data?.map((item) => (
                <option className="text-[#183529]" key={item.id} value={item.id}>
                  {item.profiles?.full_name ?? 'Aluno'} · {item.lesson_count} aulas
                </option>
              ))}
            </select>
            <ErrorText text={form.formState.errors.packageId?.message} />
          </label>
          <label className="text-sm font-semibold">
            Valor (R$)
            <input
              className="field mt-2 border-white/15 bg-white/10"
              type="number"
              step="0.01"
              {...form.register('amountReais', { valueAsNumber: true })}
            />
            <ErrorText text={form.formState.errors.amountReais?.message} />
          </label>
          <label className="text-sm font-semibold">
            Vencimento
            <input
              className="field mt-2 border-white/15 bg-white/10"
              type="date"
              {...form.register('dueOn')}
            />
          </label>
          <label className="text-sm font-semibold">
            Situação
            <select
              className="field mt-2 border-white/15 bg-white/10 text-white"
              {...form.register('status')}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option className="text-[#183529]" key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {selectedStatus === 'paid' && (
            <label className="text-sm font-semibold">
              Data do pagamento
              <input
                className="field mt-2 border-white/15 bg-white/10"
                type="date"
                {...form.register('paidOn')}
              />
              <ErrorText text={form.formState.errors.paidOn?.message} />
            </label>
          )}
          {savePayment.error && (
            <p className="text-sm text-[#f0c3a9] sm:col-span-2" role="alert">
              Não foi possível salvar o pagamento.
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button
              className="bg-[#d6a850] text-[#173326] hover:bg-[#e3bd69]"
              disabled={savePayment.isPending}
              type="submit"
            >
              {savePayment.isPending && (
                <LoaderCircle className="animate-spin" size={17} />
              )}
              Salvar pagamento
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white"
              onClick={() => {
                form.reset(emptyPayment)
                setPaymentId(crypto.randomUUID())
              }}
            >
              Limpar
            </Button>
          </div>
        </form>
      </section>
      <PaymentCards payments={payments.data ?? []} onEdit={editPayment} />
    </>
  )
}

function PaymentList({ studentId }: { studentId: string }) {
  const payments = usePayments('student_id', studentId)
  return (
    <>
      <Header
        eyebrow="Seus pagamentos"
        title="Tudo em dia, à vista."
        description="Consulte vencimentos e baixas registradas pelo seu personal."
      />
      {payments.error && <PageError />}
      <PaymentCards payments={payments.data ?? []} />
    </>
  )
}

function usePayments(column: 'trainer_id' | 'student_id', userId: string) {
  return useQuery({
    queryKey: ['payments', column, userId],
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

function PaymentCards({
  payments,
  onEdit,
}: {
  payments: Tables<'payments'>[]
  onEdit?: (payment: Tables<'payments'>) => void
}) {
  return (
    <section className="mt-6 rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
      <h2 className="font-display text-2xl font-bold">Histórico financeiro</h2>
      <div className="mt-5 space-y-3">
        {payments.map((payment) => (
          <article
            className="flex flex-col gap-3 rounded-2xl bg-[#eef1ea] p-4 sm:flex-row sm:items-center sm:justify-between"
            key={payment.id}
          >
            <div>
              <p className="font-semibold">{formatCurrency(payment.amount_cents)}</p>
              <p className="mt-1 text-xs text-[#718178]">
                Vence em {formatDate(payment.due_on)} · {statusLabels[payment.status]}
              </p>
              {payment.paid_on && (
                <p className="mt-1 text-xs text-[#2d6849]">
                  Pago em {formatDate(payment.paid_on)}
                </p>
              )}
            </div>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(payment)}>
                <PencilLine size={16} /> Editar
              </Button>
            )}
          </article>
        ))}
        {!payments.length && (
          <div className="py-8 text-center">
            <ReceiptText className="mx-auto text-[#a47b2e]" />
            <p className="mt-3 text-sm text-[#718178]">Nenhum pagamento registrado.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-5xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app"
        >
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>
        {children}
      </PageReveal>
    </main>
  )
}
function Header({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="mt-7">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
        {eyebrow}
      </p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-[#60746a]">{description}</p>
    </header>
  )
}
function ErrorText({ text }: { text?: string }) {
  return text ? <span className="mt-1 block text-xs text-[#f0c3a9]">{text}</span> : null
}
function PageError() {
  return (
    <p className="mt-6 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]" role="alert">
      Não foi possível carregar seus pagamentos.
    </p>
  )
}
const statusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}
const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  )
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
