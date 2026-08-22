import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  LoaderCircle,
  PackageCheck,
  Plus,
  ReceiptText,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import { useAuth } from '@/features/auth/auth-context'
import {
  creditAdjustmentSchema,
  packageSchema,
  type CreditAdjustmentValues,
  type PackageValues,
} from '@/features/packages/schemas'
import { requireSupabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

type Relationship = Tables<'trainer_student_relationships'> & {
  profiles: { full_name: string } | null
}

export function PackagesPage() {
  const { profile } = useAuth()

  if (!profile) return null

  return profile.role === 'trainer' ? (
    <TrainerPackages trainerId={profile.id} />
  ) : (
    <StudentPackages studentId={profile.id} />
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

function TrainerPackages({ trainerId }: { trainerId: string }) {
  const queryClient = useQueryClient()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const relationships = useRelationships(trainerId)
  const selectedStudent = selectedStudentId || relationships.data?.[0]?.student_id || ''
  const packageForm = useForm<PackageValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      relationshipId: '',
      lessonCount: 8,
      priceReais: 500,
      startsOn: toDateInput(new Date()),
      expiresOn: toDateInput(addDays(new Date(), 30)),
    },
  })
  const adjustmentForm = useForm<CreditAdjustmentValues>({
    resolver: zodResolver(creditAdjustmentSchema),
    defaultValues: { amount: 1, reason: '' },
  })
  const packages = usePackages(selectedStudent)
  const ledger = useLedger(selectedStudent)
  const balance = useBalance(selectedStudent)

  const refreshFinancialData = () => {
    void queryClient.invalidateQueries({ queryKey: ['packages'] })
    void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] })
    void queryClient.invalidateQueries({ queryKey: ['credit-balance'] })
  }

  const createPackage = useMutation({
    mutationFn: async (values: PackageValues) => {
      const relationship = relationships.data?.find(
        (item) => item.id === values.relationshipId,
      )
      if (!relationship) throw new Error('RELATIONSHIP_REQUIRED')

      const { error } = await requireSupabase()
        .from('lesson_packages')
        .insert({
          trainer_id: trainerId,
          student_id: relationship.student_id,
          relationship_id: relationship.id,
          lesson_count: values.lessonCount,
          price_cents: Math.round(values.priceReais * 100),
          starts_on: values.startsOn,
          expires_on: values.expiresOn,
        })
      if (error) throw error
      return relationship.student_id
    },
    onSuccess: (studentId) => {
      setSelectedStudentId(studentId)
      packageForm.reset({
        relationshipId: '',
        lessonCount: 8,
        priceReais: 500,
        startsOn: toDateInput(new Date()),
        expiresOn: toDateInput(addDays(new Date(), 30)),
      })
      refreshFinancialData()
    },
  })

  const activatePackage = useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await requireSupabase().rpc('activate_lesson_package', {
        target_package_id: packageId,
      })
      if (error) throw error
    },
    onSuccess: refreshFinancialData,
  })

  const cancelPackage = useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await requireSupabase().rpc('cancel_lesson_package', {
        target_package_id: packageId,
      })
      if (error) throw error
    },
    onSuccess: refreshFinancialData,
  })

  const adjustCredits = useMutation({
    mutationFn: async (values: CreditAdjustmentValues) => {
      if (!selectedStudent) throw new Error('STUDENT_REQUIRED')
      const { error } = await requireSupabase().rpc('adjust_student_credits', {
        target_student_id: selectedStudent,
        adjustment_amount: values.amount,
        adjustment_reason: values.reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      adjustmentForm.reset({ amount: 1, reason: '' })
      refreshFinancialData()
    },
  })

  return (
    <PageShell>
      <PageHeader
        eyebrow="Pacotes e créditos"
        title="Saldo que sempre fecha."
        description="Ative pacotes e acompanhe cada crédito pelo extrato, sem contador editável."
      />

      {relationships.error && (
        <PageError text="Não foi possível carregar seus alunos vinculados." />
      )}

      {!relationships.isLoading && !relationships.data?.length ? (
        <EmptyState text="Vincule um aluno antes de criar um pacote." />
      ) : (
        <>
          <section className="mt-8 rounded-[2rem] bg-[#173d2c] p-6 text-white sm:p-7">
            <PackageCheck className="text-[#efc86f]" size={25} />
            <h2 className="font-display mt-4 text-2xl font-bold">Criar pacote</h2>
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                void packageForm.handleSubmit((values) => createPackage.mutate(values))(
                  event,
                )
              }}
            >
              <label className="text-sm font-semibold sm:col-span-2">
                Aluno
                <select
                  className="field mt-2 border-white/15 bg-white/10 text-white"
                  {...packageForm.register('relationshipId')}
                >
                  <option className="text-[#183529]" value="">
                    Selecione
                  </option>
                  {relationships.data?.map((relationship) => (
                    <option
                      className="text-[#183529]"
                      key={relationship.id}
                      value={relationship.id}
                    >
                      {relationship.profiles?.full_name ?? 'Aluno'}
                    </option>
                  ))}
                </select>
                <FieldError
                  message={packageForm.formState.errors.relationshipId?.message}
                />
              </label>
              <NumberField
                label="Quantidade de aulas"
                registration={packageForm.register('lessonCount', {
                  valueAsNumber: true,
                })}
              />
              <NumberField
                label="Valor (R$)"
                step="0.01"
                registration={packageForm.register('priceReais', { valueAsNumber: true })}
              />
              <DateField label="Início" registration={packageForm.register('startsOn')} />
              <DateField
                label="Renovação prevista"
                error={packageForm.formState.errors.expiresOn?.message}
                registration={packageForm.register('expiresOn')}
              />
              <Button
                className="bg-[#d6a850] text-[#173326] hover:bg-[#e3bd69] sm:col-span-2"
                disabled={createPackage.isPending}
                type="submit"
              >
                {createPackage.isPending ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                Criar como rascunho
              </Button>
              {createPackage.error && (
                <ActionError text="Não foi possível criar o pacote." />
              )}
            </form>
          </section>

          <StudentSelector
            relationships={relationships.data ?? []}
            value={selectedStudent}
            onChange={setSelectedStudentId}
          />
          {(packages.error || ledger.error || balance.error) && (
            <PageError text="Não foi possível carregar os dados financeiros deste aluno." />
          )}
          <FinancialSummary balance={balance.data ?? 0} packages={packages.data ?? []} />
          <PackageList
            packages={packages.data ?? []}
            onActivate={(id) => activatePackage.mutate(id)}
            onCancel={(id) => cancelPackage.mutate(id)}
            pending={activatePackage.isPending || cancelPackage.isPending}
          />

          <section className="mt-6 rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
            <CircleDollarSign className="text-[#a47b2e]" size={24} />
            <h2 className="font-display mt-4 text-2xl font-bold">Ajuste compensatório</h2>
            <p className="mt-2 text-sm text-[#687b71]">
              A correção cria um novo lançamento e nunca altera o histórico.
            </p>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
              onSubmit={(event) => {
                void adjustmentForm.handleSubmit((values) =>
                  adjustCredits.mutate(values),
                )(event)
              }}
            >
              <NumberField
                label="Créditos (+ ou -)"
                registration={adjustmentForm.register('amount', { valueAsNumber: true })}
              />
              <label className="text-sm font-semibold">
                Justificativa
                <input
                  className="field mt-2"
                  maxLength={240}
                  {...adjustmentForm.register('reason')}
                />
                <FieldError message={adjustmentForm.formState.errors.reason?.message} />
              </label>
              <Button
                disabled={!selectedStudent || adjustCredits.isPending}
                type="submit"
              >
                Registrar ajuste
              </Button>
            </form>
            {adjustCredits.error && (
              <ActionError text="Ajuste recusado. O saldo não pode ficar negativo." />
            )}
          </section>
          <Ledger entries={ledger.data ?? []} />
        </>
      )}
    </PageShell>
  )
}

function StudentPackages({ studentId }: { studentId: string }) {
  const packages = usePackages(studentId)
  const ledger = useLedger(studentId)
  const balance = useBalance(studentId)

  if (packages.isLoading || ledger.isLoading || balance.isLoading) {
    return (
      <PageShell>
        <p className="mt-10 text-sm font-semibold">Carregando seu pacote…</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Seu pacote"
        title={`${balance.data ?? 0} créditos disponíveis.`}
        description="O saldo abaixo é calculado diretamente do seu extrato de movimentações."
      />
      {(packages.error || ledger.error || balance.error) && (
        <PageError text="Não foi possível carregar seu pacote e extrato." />
      )}
      <FinancialSummary balance={balance.data ?? 0} packages={packages.data ?? []} />
      <PackageList packages={packages.data ?? []} />
      <Ledger entries={ledger.data ?? []} />
    </PageShell>
  )
}

function useRelationships(trainerId: string) {
  return useQuery({
    queryKey: ['package-relationships', trainerId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select('*, profiles!trainer_student_relationships_student_id_fkey(full_name)')
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
  })
}

function usePackages(studentId: string) {
  return useQuery({
    queryKey: ['packages', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('lesson_packages')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useLedger(studentId: string) {
  return useQuery({
    queryKey: ['credit-ledger', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('credit_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useBalance(studentId: string) {
  return useQuery({
    queryKey: ['credit-balance', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: studentId,
      })
      if (error) throw error
      return data
    },
  })
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="mt-7 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
        {eyebrow}
      </p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 leading-7 text-[#60746a]">{description}</p>
    </header>
  )
}

function StudentSelector({
  relationships,
  value,
  onChange,
}: {
  relationships: Relationship[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-8 block max-w-sm text-sm font-semibold">
      Visualizar aluno
      <select
        className="field mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {relationships.map((relationship) => (
          <option key={relationship.id} value={relationship.student_id}>
            {relationship.profiles?.full_name ?? 'Aluno'}
          </option>
        ))}
      </select>
    </label>
  )
}

function FinancialSummary({
  balance,
  packages,
}: {
  balance: number
  packages: Tables<'lesson_packages'>[]
}) {
  const active = packages.find((item) => item.status === 'active')
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <SummaryCard
        icon={<Banknote size={20} />}
        label="Saldo atual"
        value={`${balance} créditos`}
      />
      <SummaryCard
        icon={<PackageCheck size={20} />}
        label="Pacote ativo"
        value={active ? `${active.lesson_count} aulas` : 'Nenhum'}
      />
      <SummaryCard
        icon={<ReceiptText size={20} />}
        label="Renovação prevista"
        value={active ? formatDate(active.expires_on) : '—'}
      />
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl bg-[#173d2c] p-5 text-white">
      <span className="text-[#efc86f]">{icon}</span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#b9cdc1]">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function PackageList({
  packages,
  onActivate,
  onCancel,
  pending = false,
}: {
  packages: Tables<'lesson_packages'>[]
  onActivate?: (id: string) => void
  onCancel?: (id: string) => void
  pending?: boolean
}) {
  return (
    <section className="mt-6 rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
      <h2 className="font-display text-2xl font-bold">Pacotes</h2>
      <div className="mt-5 space-y-3">
        {packages.map((item) => (
          <div
            className="flex flex-col gap-3 rounded-2xl bg-[#eef1ea] p-4 sm:flex-row sm:items-center sm:justify-between"
            key={item.id}
          >
            <div>
              <p className="font-semibold">
                {item.lesson_count} aulas · {formatCurrency(item.price_cents)}
              </p>
              <p className="mt-1 text-xs text-[#718178]">
                {getPackageStatusLabel(item)} · início {formatDate(item.starts_on)} ·
                renovação {formatDate(item.expires_on)}
              </p>
            </div>
            {item.status === 'draft' && onActivate && onCancel && (
              <div className="flex gap-2">
                <Button disabled={pending} onClick={() => onActivate(item.id)}>
                  Ativar
                </Button>
                <Button
                  disabled={pending}
                  variant="ghost"
                  onClick={() => onCancel(item.id)}
                >
                  <XCircle size={16} />
                  Cancelar
                </Button>
              </div>
            )}
            {item.status === 'active' && onCancel && (
              <Button
                disabled={pending}
                variant="ghost"
                onClick={() => onCancel(item.id)}
              >
                <XCircle size={16} />
                Cancelar
              </Button>
            )}
          </div>
        ))}
        {!packages.length && (
          <p className="py-5 text-center text-sm text-[#718178]">
            Nenhum pacote registrado.
          </p>
        )}
      </div>
    </section>
  )
}

function Ledger({ entries }: { entries: Tables<'credit_transactions'>[] }) {
  return (
    <section className="mt-6 rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
      <h2 className="font-display text-2xl font-bold">Extrato de créditos</h2>
      <div className="mt-5 space-y-2">
        {entries.map((entry) => (
          <div
            className="flex items-center justify-between rounded-2xl bg-[#eef1ea] p-4"
            key={entry.id}
          >
            <div>
              <p className="font-semibold">{transactionLabel[entry.transaction_type]}</p>
              <p className="mt-1 text-xs text-[#718178]">
                {entry.reason || formatDateTime(entry.created_at)}
              </p>
            </div>
            <strong className={entry.amount > 0 ? 'text-[#2d6849]' : 'text-[#9b4436]'}>
              {entry.amount > 0 ? '+' : ''}
              {entry.amount}
            </strong>
          </div>
        ))}
        {!entries.length && (
          <p className="py-5 text-center text-sm text-[#718178]">Nenhuma movimentação.</p>
        )}
      </div>
    </section>
  )
}

function NumberField({
  label,
  registration,
  step = '1',
}: {
  label: string
  registration: UseFormRegisterReturn
  step?: string
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="field mt-2" type="number" step={step} {...registration} />
    </label>
  )
}

function DateField({
  label,
  registration,
  error,
}: {
  label: string
  registration: UseFormRegisterReturn
  error?: string
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="field mt-2" type="date" {...registration} />
      <FieldError message={error} />
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="mt-1 block text-xs text-[#f0c3a9]">{message}</span>
  ) : null
}
function ActionError({ text }: { text: string }) {
  return (
    <p className="text-sm text-[#f0c3a9] sm:col-span-2" role="alert">
      {text}
    </p>
  )
}
function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-8 rounded-[2rem] border border-dashed border-[#173d2c]/15 bg-white/50 px-6 py-12 text-center text-sm text-[#687b71]">
      {text}
    </p>
  )
}
function PageError({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]" role="alert">
      {text}
    </p>
  )
}

const statusLabel = {
  draft: 'Rascunho',
  active: 'Ativo',
  exhausted: 'Esgotado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}
const getPackageStatusLabel = (item: Tables<'lesson_packages'>) => {
  return statusLabel[item.status]
}
const transactionLabel = {
  package_activation: 'Ativação do pacote',
  package_cancellation: 'Cancelamento do pacote',
  appointment_consumption: 'Consumo por aula',
  cancellation_refund: 'Devolução por cancelamento',
  manual_adjustment: 'Ajuste manual',
}
const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  )
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
const toDateInput = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
