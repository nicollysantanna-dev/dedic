import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Dumbbell,
  LoaderCircle,
  MessageCircle,
  PackagePlus,
  Plus,
  Target,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { creditAdjustmentSchema, packageSchema } from '@/features/packages/schemas'
import { ProgressSection } from '@/features/progress/ProgressSection'
import { StudentRoutinesSection } from '@/features/workouts/StudentRoutinesSection'
import { whatsappLink, whatsappTemplates } from '@/features/notifications/whatsapp'
import {
  toStudentOverview,
  type StudentOverview,
} from '@/features/students/student-overview'
import { appointmentKeys } from '@/features/appointments/keys'
import { creditKeys } from '@/features/credits/keys'
import { formatDateTime, formatTime, toIsoDate } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase/client'

export function StudentProfilePage() {
  const { studentId } = useParams()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isCreditManagerOpen, setIsCreditManagerOpen] = useState(false)
  const [isEndingRelationship, setIsEndingRelationship] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const endRelationship = useMutation({
    mutationFn: async (relationshipId: string) => {
      const { error } = await requireSupabase().rpc('end_relationship', {
        target_relationship_id: relationshipId,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.all })
      void navigate('/app/alunos', { replace: true })
    },
  })
  const trainerId = profile?.id ?? ''

  const student = useQuery({
    queryKey: appointmentKeys.studentProfile(trainerId, studentId!),
    enabled: Boolean(trainerId && studentId) && profile?.role === 'trainer',
    queryFn: async () => {
      const { data: relationship, error: relationshipError } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'id, student_id, profiles!trainer_student_relationships_student_id_fkey(full_name, phone)',
        )
        .eq('trainer_id', trainerId)
        .eq('student_id', studentId!)
        .eq('status', 'active')
        .maybeSingle()
      if (relationshipError) throw relationshipError
      if (!relationship) return null

      const [summary, appointments, packages] = await Promise.all([
        requireSupabase()
          .from('student_activity_summary')
          .select('*')
          .eq('trainer_id', trainerId)
          .eq('student_id', studentId!)
          .maybeSingle(),
        requireSupabase()
          .from('appointments')
          .select('id, student_id, starts_at, ends_at, status')
          .eq('trainer_id', trainerId)
          .eq('student_id', studentId!)
          .order('starts_at', { ascending: false }),
        requireSupabase()
          .from('lesson_packages')
          .select('*')
          .eq('trainer_id', trainerId)
          .eq('student_id', studentId!),
      ])
      const error = summary.error || appointments.error || packages.error
      if (error) throw error
      if (!summary.data) return null
      const overview = toStudentOverview(summary.data)
      return {
        overview,
        relationship,
        appointments: appointments.data,
        packages: packages.data,
      }
    },
  })

  if (profile?.role !== 'trainer') return <Navigate to="/app/alunos" replace />

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-7xl">
        <Link
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
          to="/app/alunos"
        >
          <ArrowLeft size={17} /> Voltar para alunos
        </Link>

        {student.isLoading && <p className="mt-8 text-sm">Carregando perfil…</p>}
        {student.error && (
          <p className="mt-8 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível carregar este aluno.
          </p>
        )}
        {!student.isLoading && !student.error && !student.data && (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            Aluno não encontrado ou sem vínculo ativo.
          </p>
        )}

        {student.data && (
          <>
            <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-full bg-blue-500/20 text-lg font-bold text-blue-300">
                  {student.data.overview.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm text-slate-400">Perfil do aluno</p>
                  <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
                    {student.data.overview.name}
                  </h1>
                </div>
              </div>
              <Button onClick={() => setIsCreditManagerOpen(true)} type="button">
                <Plus size={17} /> Adicionar aulas
              </Button>
            </header>

            {notice && (
              <p
                className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"
                role="status"
              >
                {notice}
              </p>
            )}

            <WhatsappShortcuts overview={student.data.overview} />

            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                icon={CalendarDays}
                label="Próxima aula"
                value={
                  student.data.overview.nextAppointment
                    ? formatDateTime(student.data.overview.nextAppointment)
                    : 'Não marcada'
                }
              />
              <SummaryCard
                icon={Target}
                label="Frequência"
                value={
                  student.data.overview.attendance === null
                    ? 'Sem histórico'
                    : `${student.data.overview.attendance}%`
                }
              />
              <SummaryCard
                icon={Dumbbell}
                label="Créditos"
                value={String(student.data.overview.balance)}
              />
              <SummaryCard
                icon={CircleDollarSign}
                label="Financeiro"
                value={paymentLabel(student.data.overview.paymentStatus)}
              />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
                <h2 className="font-bold">Histórico recente de aulas</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {student.data.appointments.slice(0, 6).map((appointment) => (
                    <div
                      className="flex items-center justify-between gap-4 py-3 text-sm"
                      key={appointment.id}
                    >
                      <div>
                        <p className="font-semibold">
                          {formatDateTime(appointment.starts_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatTime(appointment.starts_at)}–
                          {formatTime(appointment.ends_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                        {statusLabel(appointment.status)}
                      </span>
                    </div>
                  ))}
                  {!student.data.appointments.length && (
                    <p className="py-10 text-center text-sm text-slate-500">
                      Nenhuma aula registrada.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
                  <h3 className="font-bold">Encerrar vínculo</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    O histórico de aulas, créditos e pagamentos é preservado. O aluno
                    deixa de ver sua agenda e não consegue mais agendar.
                  </p>
                  {isEndingRelationship ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-red-200" role="alert">
                        Confirma o encerramento do vínculo com{' '}
                        {student.data.overview.name}?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          disabled={endRelationship.isPending}
                          onClick={() =>
                            endRelationship.mutate(student.data!.relationship.id)
                          }
                        >
                          {endRelationship.isPending && (
                            <LoaderCircle className="animate-spin" size={17} />
                          )}
                          Sim, encerrar
                        </Button>
                        <Button
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          disabled={endRelationship.isPending}
                          onClick={() => setIsEndingRelationship(false)}
                          variant="outline"
                        >
                          Manter vínculo
                        </Button>
                      </div>
                      {endRelationship.error && (
                        <p className="text-sm text-red-200" role="alert">
                          Não foi possível encerrar o vínculo. Tente novamente.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="mt-4 border-white/15 bg-transparent text-white hover:bg-white/10"
                      onClick={() => setIsEndingRelationship(true)}
                      variant="outline"
                    >
                      Encerrar vínculo
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <StudentRoutinesSection
              trainerId={trainerId}
              studentId={student.data.relationship.student_id}
            />

            <section className="mt-5">
              <h2 className="mb-3 text-lg font-bold">Evolução física</h2>
              <ProgressSection
                studentId={student.data.relationship.student_id}
                viewerId={trainerId}
                viewerRole="trainer"
              />
            </section>

            {isCreditManagerOpen && (
              <CreditManagerDialog
                balance={student.data.overview.balance}
                name={student.data.overview.name}
                relationshipId={student.data.relationship.id}
                studentId={student.data.relationship.student_id}
                onClose={() => setIsCreditManagerOpen(false)}
                onSaved={async (message) => {
                  setNotice(message)
                  setIsCreditManagerOpen(false)
                  await Promise.all([
                    student.refetch(),
                    queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
                    queryClient.invalidateQueries({ queryKey: creditKeys.all }),
                  ])
                }}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}

/** Mensagens prontas para o WhatsApp do aluno (envio manual, RF-26). */
function WhatsappShortcuts({ overview }: { overview: StudentOverview }) {
  const messages = [
    overview.nextAppointment
      ? {
          label: 'Lembrar da aula',
          text: whatsappTemplates.lessonReminder(overview.name, overview.nextAppointment),
        }
      : null,
    {
      label: 'Renovação',
      text: whatsappTemplates.renewal(overview.name, overview.balance),
    },
    overview.alerts.some((alert) => alert.kind === 'inactive')
      ? { label: 'Sentimos sua falta', text: whatsappTemplates.inactivity(overview.name) }
      : null,
  ].filter((item): item is { label: string; text: string } => item !== null)

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
        <MessageCircle size={14} /> WhatsApp:
      </span>
      {messages.map((message) => {
        const href = whatsappLink(overview.phone, message.text)
        return href ? (
          <a
            className="inline-flex min-h-9 items-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
            href={href}
            key={message.label}
            rel="noreferrer"
            target="_blank"
          >
            {message.label}
          </a>
        ) : (
          <span className="text-xs text-slate-500" key={message.label}>
            Cadastre o celular do aluno para enviar mensagens.
          </span>
        )
      })}
    </div>
  )
}

type CreditManagerMode = 'package' | 'single' | 'adjustment'

export function CreditManagerDialog({
  balance,
  name,
  relationshipId,
  studentId,
  onClose,
  onSaved,
}: {
  balance: number
  name: string
  relationshipId: string
  studentId: string
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}) {
  const [mode, setMode] = useState<CreditManagerMode>('package')
  const [lessonCount, setLessonCount] = useState(8)
  const [priceReais, setPriceReais] = useState(500)
  const [startsOn, setStartsOn] = useState(toIsoDate(new Date()))
  const [expiresOn, setExpiresOn] = useState(toIsoDate(addDays(new Date(), 30)))
  const [activateNow, setActivateNow] = useState(true)
  const [createCharge, setCreateCharge] = useState(true)
  const [adjustmentAmount, setAdjustmentAmount] = useState(1)
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [formError, setFormError] = useState('')
  const isSingle = mode === 'single'
  const effectiveLessonCount = isSingle ? 1 : lessonCount

  const createPackage = useMutation({
    mutationFn: async () => {
      const parsed = packageSchema.safeParse({
        relationshipId,
        lessonCount: effectiveLessonCount,
        priceReais,
        startsOn,
        expiresOn,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)

      // Criação, ativação e cobrança acontecem em uma única transação no banco.
      const { error } = await requireSupabase().rpc('create_lesson_package', {
        target_student_id: studentId,
        requested_kind: isSingle ? 'single' : 'package',
        requested_lesson_count: parsed.data.lessonCount,
        requested_price_cents: Math.round(parsed.data.priceReais * 100),
        requested_starts_on: parsed.data.startsOn,
        requested_expires_on: parsed.data.expiresOn,
        activate_now: activateNow,
        create_charge: createCharge,
      })
      if (error) throw error
    },
    onSuccess: () =>
      void onSaved(
        isSingle
          ? `Aula avulsa registrada para ${name}${activateNow ? '' : ' (aguardando pagamento)'}.`
          : `${lessonCount} aulas adicionadas para ${name}${activateNow ? '' : ' (aguardando pagamento)'}.`,
      ),
    onError: (error) =>
      setFormError(
        error instanceof Error && error.message && !error.message.includes('_')
          ? error.message
          : 'Não foi possível registrar. Verifique os dados e tente novamente.',
      ),
  })

  const adjustCredits = useMutation({
    mutationFn: async () => {
      const parsed = creditAdjustmentSchema.safeParse({
        amount: adjustmentAmount,
        reason: adjustmentReason,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
      const { error } = await requireSupabase().rpc('adjust_student_credits', {
        target_student_id: studentId,
        adjustment_amount: parsed.data.amount,
        adjustment_reason: parsed.data.reason,
      })
      if (error) throw error
    },
    onSuccess: () =>
      void onSaved(
        `${Math.abs(adjustmentAmount)} crédito${Math.abs(adjustmentAmount) === 1 ? '' : 's'} ${adjustmentAmount > 0 ? 'adicionado' : 'removido'}${Math.abs(adjustmentAmount) === 1 ? '' : 's'} com justificativa.`,
      ),
    onError: (error) =>
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível registrar o ajuste.',
      ),
  })

  const isPending = createPackage.isPending || adjustCredits.isPending
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (mode === 'adjustment') adjustCredits.mutate()
    else createPackage.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose()
      }}
    >
      <section
        aria-labelledby="credit-manager-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 text-slate-950 shadow-2xl sm:max-w-xl sm:rounded-[1.75rem] sm:p-6"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Pacotes e créditos
            </p>
            <h2
              className="mt-1 text-2xl font-bold tracking-[-0.04em]"
              id="credit-manager-title"
            >
              Adicionar aulas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {name} possui {balance} créditos disponíveis.
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>

        <div className="mt-5 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
          <ModeButton active={mode === 'package'} onClick={() => setMode('package')}>
            Novo pacote
          </ModeButton>
          <ModeButton active={mode === 'single'} onClick={() => setMode('single')}>
            Aula avulsa
          </ModeButton>
          <ModeButton
            active={mode === 'adjustment'}
            onClick={() => setMode('adjustment')}
          >
            Ajuste
          </ModeButton>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode !== 'adjustment' ? (
            <>
              <p className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                {isSingle
                  ? 'Uma aula comprada fora de pacote: vale um crédito.'
                  : 'Use para uma compra ou renovação. Os créditos entram no extrato ao ativar.'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {!isSingle && (
                  <DialogNumberField
                    label="Quantidade de aulas"
                    min={1}
                    max={100}
                    value={lessonCount}
                    onChange={setLessonCount}
                  />
                )}
                <DialogNumberField
                  label="Valor (R$)"
                  min={0}
                  max={100000}
                  step="0.01"
                  value={priceReais}
                  onChange={setPriceReais}
                />
                <DialogDateField label="Início" value={startsOn} onChange={setStartsOn} />
                <DialogDateField
                  label={isSingle ? 'Validade' : 'Renovação prevista'}
                  value={expiresOn}
                  onChange={setExpiresOn}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <input
                    checked={activateNow}
                    className="size-4 accent-[var(--brand)]"
                    onChange={(event) => setActivateNow(event.target.checked)}
                    type="checkbox"
                  />
                  Liberar créditos agora
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <input
                    checked={createCharge}
                    className="size-4 accent-[var(--brand)]"
                    onChange={(event) => setCreateCharge(event.target.checked)}
                    type="checkbox"
                  />
                  Gerar cobrança no financeiro
                </label>
              </div>
              {!activateNow && (
                <p className="text-xs text-slate-500">
                  Os créditos ficam aguardando: você ativa pelo Financeiro ao confirmar o
                  pagamento.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                Use apenas para bônus ou correção. O lançamento não altera o histórico
                anterior.
              </p>
              <DialogNumberField
                label="Créditos (+ ou -)"
                min={-100}
                max={100}
                value={adjustmentAmount}
                onChange={setAdjustmentAmount}
              />
              <label className="block text-sm font-semibold">
                Justificativa
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  maxLength={240}
                  onChange={(event) => setAdjustmentReason(event.target.value)}
                  placeholder="Ex.: crédito de cortesia"
                  value={adjustmentReason}
                />
              </label>
            </>
          )}

          {formError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              {formError}
            </p>
          )}

          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <PackagePlus size={17} />
            )}
            {mode === 'adjustment'
              ? 'Registrar ajuste'
              : isSingle
                ? 'Registrar aula avulsa'
                : activateNow
                  ? 'Adicionar e ativar pacote'
                  : 'Adicionar pacote'}
          </Button>
        </form>
      </section>
    </div>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${
        active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function DialogNumberField({
  label,
  value,
  onChange,
  ...inputProps
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: string
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        {...inputProps}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.valueAsNumber)}
        type="number"
        value={value}
      />
    </label>
  )
}

function DialogDateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  )
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.25rem] bg-white p-4 text-slate-950 sm:p-5">
      <Icon className="text-blue-600" size={19} />
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  )
}

function paymentLabel(status: 'pending' | 'paid' | 'overdue' | 'cancelled' | null) {
  if (status === 'overdue') return 'Atrasado'
  if (status === 'pending') return 'Pendente'
  return 'Em dia'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Agendada',
    completed: 'Realizada',
    student_no_show: 'Falta',
    cancelled_by_student: 'Cancelada',
    cancelled_by_trainer: 'Cancelada',
    cancelled_for_reschedule: 'Remarcada',
  }
  return labels[status] ?? status
}
