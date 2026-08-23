import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CalendarClock,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  Copy,
  Dumbbell,
  Link2,
  LoaderCircle,
  LogOut,
  MailPlus,
  ReceiptText,
  PackageCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

const inviteSchema = z.object({
  contact: z.string().trim().min(1, 'Informe o contato do aluno.'),
})

export function DashboardPage() {
  const { profile, signOut } = useAuth()

  if (!profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f4f1e9]">
        <p className="text-sm font-semibold text-[#183529]">Carregando perfil…</p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#173d2c] text-white">
              <Dumbbell size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-2xl font-bold tracking-[-0.04em]">
              dedic.
            </span>
          </div>
          <Button variant="ghost" type="button" onClick={() => void signOut()}>
            <LogOut size={17} aria-hidden="true" />
            Sair
          </Button>
        </header>

        <section className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
            {profile.role === 'trainer' ? 'Espaço do personal' : 'Espaço do aluno'}
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            Olá, {profile.full_name.split(' ')[0]}.
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-[#60746a]">
            {profile.role === 'trainer'
              ? 'Convide seus alunos e acompanhe os vínculos ativos.'
              : 'Seu vínculo é criado automaticamente pelo convite do personal.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {profile.role === 'trainer' && (
              <Button asChild>
                <Link to="/app/criar-aula">
                  <CalendarPlus size={17} aria-hidden="true" />
                  Criar aula
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link
                to={
                  profile.role === 'trainer' ? '/app/disponibilidade' : '/app/calendario'
                }
              >
                {profile.role === 'trainer' ? (
                  <CalendarClock size={17} aria-hidden="true" />
                ) : (
                  <CalendarDays size={17} aria-hidden="true" />
                )}
                {profile.role === 'trainer'
                  ? 'Gerenciar disponibilidade'
                  : 'Ver horários disponíveis'}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/pagamentos">
                <ReceiptText size={17} aria-hidden="true" />
                Pagamentos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/agenda">
                <CalendarCheck size={17} aria-hidden="true" />
                Minha agenda
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/pacotes">
                <PackageCheck size={17} aria-hidden="true" />
                Pacotes e créditos
              </Link>
            </Button>
          </div>
        </section>

        <DashboardOverview userId={profile.id} role={profile.role} />

        {profile.role === 'trainer' ? (
          <TrainerDashboard trainerId={profile.id} />
        ) : (
          <StudentDashboard studentId={profile.id} />
        )}
      </PageReveal>
    </main>
  )
}

function DashboardOverview({
  userId,
  role,
}: {
  userId: string
  role: 'trainer' | 'student'
}) {
  const isTrainer = role === 'trainer'
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const soon = new Date(todayStart)
  soon.setDate(soon.getDate() + 7)

  const nextAppointment = useQuery({
    queryKey: ['dashboard-next-appointment', userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('appointments')
        .select('starts_at')
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .eq('status', 'scheduled')
        .gte('starts_at', now.toISOString())
        .order('starts_at')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const packages = useQuery({
    queryKey: ['dashboard-packages', userId],
    queryFn: async () => {
      let query = requireSupabase()
        .from('lesson_packages')
        .select('student_id, expires_on, status')
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .eq('status', 'active')
      if (isTrainer) query = query.lte('expires_on', soon.toISOString().slice(0, 10))
      const { data, error } = await query.order('expires_on')
      if (error) throw error
      return data
    },
  })

  const payments = useQuery({
    queryKey: ['dashboard-payments', userId],
    queryFn: async () => {
      const query = requireSupabase()
        .from('payments')
        .select('status, due_on')
        .eq(isTrainer ? 'trainer_id' : 'student_id', userId)
        .in('status', ['pending', 'overdue'])
      const { data, error } = await query.order('due_on')
      if (error) throw error
      return data
    },
  })

  const todayAppointments = useQuery({
    queryKey: ['dashboard-today-appointments', userId],
    enabled: isTrainer,
    queryFn: async () => {
      const { count, error } = await requireSupabase()
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', userId)
        .gte('starts_at', todayStart.toISOString())
        .lt('starts_at', tomorrow.toISOString())
      if (error) throw error
      return count ?? 0
    },
  })

  const balance = useQuery({
    queryKey: ['credit-balance', userId],
    enabled: !isTrainer,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('get_credit_balance', {
        target_student_id: userId,
      })
      if (error) throw error
      return data
    },
  })

  const activePackage = packages.data?.[0]
  const currentPayment = payments.data?.[0]
  const overviewError =
    nextAppointment.error || packages.error || payments.error || todayAppointments.error

  if (overviewError) {
    return (
      <p
        className="mt-8 rounded-2xl bg-[#f2ded7] p-4 text-sm text-[#8e483a]"
        role="alert"
      >
        Não foi possível carregar todos os indicadores do painel.
      </p>
    )
  }

  const cards = isTrainer
    ? [
        ['Aulas de hoje', String(todayAppointments.data ?? 0)],
        ['Próxima aula', formatNextAppointment(nextAppointment.data?.starts_at)],
        ['Renovações próximas', String(packages.data?.length ?? 0)],
        ['Pagamentos pendentes', String(payments.data?.length ?? 0)],
      ]
    : [
        ['Próxima aula', formatNextAppointment(nextAppointment.data?.starts_at)],
        ['Saldo atual', `${balance.data ?? 0} créditos`],
        [
          'Renovação prevista',
          activePackage ? formatDate(activePackage.expires_on) : 'Sem pacote',
        ],
        [
          'Pagamento',
          currentPayment
            ? currentPayment.status === 'overdue'
              ? 'Atrasado'
              : `Pendente · ${formatDate(currentPayment.due_on)}`
            : 'Sem pendências',
        ],
      ]

  return (
    <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo">
      {cards.map(([label, value]) => (
        <motion.div
          className="rounded-3xl bg-[#173d2c] p-5 text-white shadow-[0_14px_35px_rgba(23,61,44,0.12)]"
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 330, damping: 26 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#b9cdc1]">
            {label}
          </p>
          <p className="font-display mt-2 text-xl font-bold text-[#efc86f]">{value}</p>
        </motion.div>
      ))}
    </section>
  )
}

function formatNextAppointment(value?: string) {
  if (!value) return 'Nenhuma'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}

function TrainerDashboard({ trainerId }: { trainerId: string }) {
  const queryClient = useQueryClient()
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { contact: '' },
  })

  const invitations = useQuery({
    queryKey: ['invitations', trainerId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('student_invitations')
        .select('id, token, student_email, student_phone, status, expires_at, trainer_id')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

  const relationships = useQuery({
    queryKey: ['relationships', trainerId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'id, status, trainer_id, student_id, profiles!trainer_student_relationships_student_id_fkey(full_name, phone)',
        )
        .eq('trainer_id', trainerId)
        .eq('status', 'active')

      if (error) throw error
      return data
    },
  })

  const createInvitation = useMutation({
    mutationFn: async ({ contact }: z.infer<typeof inviteSchema>) => {
      const invitationContact =
        contactType === 'email'
          ? { student_email: z.email().parse(contact.toLowerCase()), student_phone: null }
          : { student_email: null, student_phone: normalizeBrazilianPhone(contact) }
      const { data, error } = await requireSupabase()
        .from('student_invitations')
        .insert({ trainer_id: trainerId, ...invitationContact })
        .select('id, token, student_email, student_phone, status, expires_at, trainer_id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (invitation) => {
      const link = `${window.location.origin}/cadastro?convite=${invitation.token}`
      setCreatedLink(link)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['invitations', trainerId] })
    },
  })

  return (
    <div className="mt-9 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] bg-[#173d2c] p-6 text-white sm:p-7">
        <MailPlus className="text-[#efc86f]" size={25} aria-hidden="true" />
        <h2 className="font-display mt-5 text-2xl font-bold tracking-[-0.04em]">
          Convidar aluno
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#b9cdc1]">
          Por e-mail, o vínculo é automático no primeiro acesso. Por celular, envie o link
          privado pelo WhatsApp.
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            void form.handleSubmit((values) => createInvitation.mutate(values))(event)
          }}
        >
          <div
            className="mb-4 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Tipo de contato"
          >
            {(['email', 'phone'] as const).map((type) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  contactType === type ? 'bg-[#d6a850] text-[#173326]' : 'bg-white/10'
                }`}
                key={type}
                type="button"
                onClick={() => {
                  setContactType(type)
                  form.reset()
                }}
              >
                {type === 'email' ? 'E-mail' : 'Celular'}
              </button>
            ))}
          </div>
          <label className="text-sm font-semibold" htmlFor="student-contact">
            {contactType === 'email' ? 'E-mail do aluno' : 'Celular com DDD'}
          </label>
          <input
            id="student-contact"
            type={contactType === 'email' ? 'email' : 'tel'}
            className="field mt-2 border-white/15 bg-white/10 text-white placeholder:text-white/40"
            placeholder={contactType === 'email' ? 'aluno@email.com' : '(11) 99999-9999'}
            {...form.register('contact')}
          />
          {form.formState.errors.contact && (
            <p className="mt-1 text-xs text-[#f0c3a9]" role="alert">
              {form.formState.errors.contact.message}
            </p>
          )}
          {createInvitation.error && (
            <p className="mt-2 text-xs text-[#f0c3a9]" role="alert">
              {createInvitation.error.message === 'INVALID_PHONE'
                ? 'Informe um celular válido com DDD.'
                : createInvitation.error instanceof z.ZodError
                  ? 'Informe um e-mail válido.'
                  : 'Não foi possível criar o convite. Verifique se já existe um convite pendente.'}
            </p>
          )}
          <Button
            className="mt-4 w-full bg-[#d6a850] text-[#173326] hover:bg-[#e3bd69]"
            disabled={createInvitation.isPending}
            type="submit"
          >
            {createInvitation.isPending && (
              <LoaderCircle className="animate-spin" size={17} />
            )}
            Gerar convite
          </Button>
        </form>

        {createdLink && (
          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#b9cdc1]">
              Link criado
            </p>
            <p className="mt-2 break-all text-sm">{createdLink}</p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#efc86f]"
              onClick={() => {
                void navigator.clipboard.writeText(createdLink)
                setCopied(true)
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a887f]">
              Sua rede
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-[-0.04em]">
              Alunos e convites
            </h2>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-[#e3ebe3] text-[#2d5a43]">
            <UsersRound size={21} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {relationships.data?.map((relationship) => (
            <div
              key={relationship.id}
              className="flex items-center gap-3 rounded-2xl bg-[#eef1ea] p-4"
            >
              <span className="grid size-10 place-items-center rounded-full bg-white text-[#315f47]">
                <UserRound size={18} />
              </span>
              <div>
                <p className="font-semibold">
                  {relationship.profiles?.full_name ?? 'Aluno'}
                </p>
                <p className="text-xs text-[#718178]">Vínculo ativo</p>
              </div>
            </div>
          ))}

          {invitations.data
            ?.filter((invitation) => invitation.status === 'pending')
            .map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-[#173d2c]/15 p-4"
              >
                <span className="grid size-10 place-items-center rounded-full bg-[#f4ead2] text-[#8f6a25]">
                  <Link2 size={18} />
                </span>
                <div>
                  <p className="font-semibold">
                    {invitation.student_email ?? invitation.student_phone}
                  </p>
                  <p className="text-xs text-[#718178]">Aguardando primeiro acesso</p>
                </div>
              </div>
            ))}

          {!relationships.isLoading &&
            !invitations.isLoading &&
            !relationships.data?.length &&
            !invitations.data?.length && (
              <p className="rounded-2xl bg-[#eef1ea] px-4 py-6 text-center text-sm text-[#6a7a72]">
                Seus alunos e convites aparecerão aqui.
              </p>
            )}
        </div>
      </section>
    </div>
  )
}

function StudentDashboard({ studentId }: { studentId: string }) {
  const relationships = useQuery({
    queryKey: ['student-relationships', studentId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'id, status, trainer_id, student_id, profiles!trainer_student_relationships_trainer_id_fkey(full_name, phone)',
        )
        .eq('student_id', studentId)
        .eq('status', 'active')

      if (error) throw error
      return data
    },
  })

  const activeRelationship = relationships.data?.[0]

  return (
    <section className="mt-9 max-w-2xl rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-8">
      {activeRelationship ? (
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#dcebdc] text-[#285b40]">
            <Check size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a887f]">
              Personal vinculado
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-[-0.04em]">
              {activeRelationship.profiles?.full_name ?? 'Seu personal'}
            </h2>
            <p className="mt-2 text-sm text-[#687b71]">
              O vínculo está ativo. Você já pode consultar os horários disponíveis.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <MailPlus size={24} className="mx-auto text-[#a47b2e]" aria-hidden="true" />
          <h2 className="font-display mt-4 text-2xl font-bold tracking-[-0.04em]">
            Aguardando vínculo
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#687b71]">
            Entre com o e-mail convidado ou abra o link recebido pelo WhatsApp. O vínculo
            será criado automaticamente.
          </p>
        </div>
      )}
    </section>
  )
}

function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  const nationalNumber = digits.startsWith('55') ? digits.slice(2) : digits
  if (!/^\d{10,11}$/.test(nationalNumber)) {
    throw new Error('INVALID_PHONE')
  }
  return `+55${nationalNumber}`
}
