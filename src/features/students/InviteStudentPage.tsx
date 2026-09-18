import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  formatPhoneInput,
  parseInvitationContact,
  type InvitationContactType,
} from '@/features/students/invitation-contact'
import { requireSupabase } from '@/lib/supabase/client'

type CreatedInvitation = {
  contact: string
  link: string
  type: InvitationContactType
}

export function InviteStudentPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [contactType, setContactType] = useState<InvitationContactType>('email')
  const [contact, setContact] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)
  const [pendingActionError, setPendingActionError] = useState<string | null>(null)
  const [currentTime] = useState(() => Date.now())
  const trainerId = profile?.id ?? ''

  const invitations = useQuery({
    queryKey: ['invitations', trainerId],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('student_invitations')
        .select('id, token, student_email, student_phone, status, expires_at, created_at')
        .eq('trainer_id', trainerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const createInvitation = useMutation({
    mutationFn: async () => {
      const invitationContact = parseInvitationContact(contactType, contact)
      const { data, error } = await requireSupabase()
        .from('student_invitations')
        .insert({ trainer_id: trainerId, ...invitationContact })
        .select('token, student_email, student_phone')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (invitation) => {
      setCreatedInvitation({
        contact: invitation.student_email ?? invitation.student_phone ?? contact,
        link: `${window.location.origin}/cadastro?convite=${invitation.token}`,
        type: contactType,
      })
      setContact('')
      setCopied(false)
      setValidationError(null)
      void queryClient.invalidateQueries({ queryKey: ['invitations', trainerId] })
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        setValidationError('Informe um e-mail válido.')
        return
      }
      if (error.message.includes('INVALID_PHONE')) {
        setValidationError('Informe um celular válido com DDD.')
      }
    },
  })

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await requireSupabase().rpc('cancel_student_invitation', {
        target_invitation_id: invitationId,
      })
      if (error) throw error
      return invitationId
    },
    onSuccess: () => {
      setPendingActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['invitations', trainerId] })
    },
    onError: () => {
      setPendingActionError('Não foi possível cancelar este convite. Tente novamente.')
    },
  })

  if (profile?.role !== 'trainer') return <Navigate to="/app/alunos" replace />

  const copyLink = async () => {
    if (!createdInvitation) return
    await navigator.clipboard.writeText(createdInvitation.link)
    setCopied(true)
  }

  const copyPendingInvitation = async (invitationId: string, token: string) => {
    try {
      await navigator.clipboard.writeText(buildInvitationLink(token))
      setCopiedInvitationId(invitationId)
      setPendingActionError(null)
    } catch {
      setPendingActionError('Não foi possível copiar o link neste navegador.')
    }
  }

  const recreateInvitation = async (invitation: {
    id: string
    student_email: string | null
    student_phone: string | null
  }) => {
    try {
      await cancelInvitation.mutateAsync(invitation.id)
      if (invitation.student_email) {
        setContactType('email')
        setContact(invitation.student_email)
      } else {
        setContactType('phone')
        setContact(invitation.student_phone ?? '')
      }
      setCreatedInvitation(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      // A mutation apresenta a mensagem segura no painel.
    }
  }

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-6xl">
        <Link
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          to="/app/alunos"
        >
          <ArrowLeft size={17} /> Voltar para alunos
        </Link>

        <header className="mt-4">
          <p className="text-sm text-slate-400">Amplie sua carteira</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Adicionar aluno
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Informe apenas um contato. O aluno cria a própria conta e o vínculo é feito
            automaticamente.
          </p>
        </header>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <section className="overflow-hidden rounded-[1.5rem] bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
            <div className="border-b border-slate-100 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <UserPlus size={20} />
                </span>
                <div>
                  <h2 className="font-bold">Contato do aluno</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Escolha como o convite será identificado.
                  </p>
                </div>
              </div>

              <div
                aria-label="Tipo de contato"
                className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
                role="group"
              >
                {(
                  [
                    ['email', 'E-mail', Mail],
                    ['phone', 'Celular', Smartphone],
                  ] as const
                ).map(([type, label, Icon]) => (
                  <button
                    aria-pressed={contactType === type}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                      contactType === type
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    key={type}
                    onClick={() => {
                      setContactType(type)
                      setContact('')
                      setValidationError(null)
                      setCreatedInvitation(null)
                    }}
                    type="button"
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  setValidationError(null)
                  createInvitation.mutate()
                }}
              >
                <label className="block text-sm font-semibold" htmlFor="student-contact">
                  {contactType === 'email' ? 'E-mail do aluno' : 'Celular com DDD'}
                </label>
                <input
                  autoComplete={contactType === 'email' ? 'email' : 'tel'}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  id="student-contact"
                  inputMode={contactType === 'email' ? 'email' : 'tel'}
                  onChange={(event) => {
                    setContact(
                      contactType === 'phone'
                        ? formatPhoneInput(event.target.value)
                        : event.target.value,
                    )
                    setValidationError(null)
                  }}
                  placeholder={
                    contactType === 'email' ? 'aluno@email.com' : '(11) 99999-9999'
                  }
                  type={contactType === 'email' ? 'email' : 'tel'}
                  value={contact}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {validationError}
                  </p>
                )}
                {createInvitation.error && !validationError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    Não foi possível criar o convite. Verifique se este contato já possui
                    um convite pendente.
                  </p>
                )}
                <Button
                  className="mt-5 w-full"
                  disabled={createInvitation.isPending || !contact.trim()}
                  type="submit"
                >
                  {createInvitation.isPending ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <Link2 size={17} />
                  )}
                  Gerar link de convite
                </Button>
              </form>
            </div>

            <AnimatePresence mode="wait">
              {createdInvitation && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-emerald-100 bg-emerald-50 p-5 sm:p-7"
                  initial={{ opacity: 0, y: 8 }}
                  role="status"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-emerald-600"
                      size={20}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-emerald-950">Convite criado</p>
                      <p className="mt-1 text-sm text-emerald-800">
                        Envie este link para {createdInvitation.contact}.
                      </p>
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-slate-600">
                        <p className="break-all">{createdInvitation.link}</p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" onClick={() => void copyLink()}>
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? 'Link copiado' : 'Copiar link'}
                        </Button>
                        {createdInvitation.type === 'phone' && (
                          <Button variant="outline" asChild>
                            <a
                              href={buildWhatsAppLink(
                                createdInvitation.contact,
                                createdInvitation.link,
                              )}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <MessageCircle size={16} /> Abrir WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5 sm:p-6">
              <ShieldCheck className="text-blue-400" size={23} />
              <h2 className="mt-4 font-bold">Como funciona</h2>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-400">
                <Step number="1" text="Você gera e envia o link privado ao aluno." />
                <Step
                  number="2"
                  text="O aluno cria a conta usando o contato convidado."
                />
                <Step number="3" text="O vínculo aparece automaticamente na sua lista." />
              </ol>
              <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-slate-500">
                Não há etapa de aprovação manual. O link por celular deve ser aberto pelo
                próprio aluno.
              </p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Convites pendentes</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Aguardando o primeiro acesso.
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {invitations.data?.length ?? 0}
                </span>
              </div>

              {invitations.isLoading && (
                <p className="mt-5 text-sm text-slate-500">Carregando convites…</p>
              )}
              {invitations.error && (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  Não foi possível carregar os convites.
                </p>
              )}
              {pendingActionError && (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  {pendingActionError}
                </p>
              )}
              <div className="mt-5 space-y-3">
                {invitations.data?.map((invitation) => {
                  const contact =
                    invitation.student_email ?? invitation.student_phone ?? ''
                  const expired = new Date(invitation.expires_at).getTime() <= currentTime
                  const invitationLink = buildInvitationLink(invitation.token)

                  return (
                    <div
                      className={`rounded-xl border p-4 ${
                        expired
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-transparent bg-slate-50'
                      }`}
                      key={invitation.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{contact}</p>
                          <p
                            className={`mt-1 text-xs ${
                              expired ? 'font-semibold text-amber-700' : 'text-slate-500'
                            }`}
                          >
                            {expired
                              ? `Expirou em ${formatExpiration(invitation.expires_at)}`
                              : `Expira em ${formatExpiration(invitation.expires_at)}`}
                          </p>
                        </div>
                        {expired && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.68rem] font-bold text-amber-800">
                            Expirado
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {!expired && invitation.student_phone && (
                          <Button
                            asChild
                            className="min-h-9 px-3 text-xs"
                            variant="outline"
                          >
                            <a
                              href={buildWhatsAppLink(contact, invitationLink)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <MessageCircle size={14} /> Reenviar
                            </a>
                          </Button>
                        )}
                        {!expired && invitation.student_email && (
                          <Button
                            onClick={() =>
                              void copyPendingInvitation(invitation.id, invitation.token)
                            }
                            className="min-h-9 px-3 text-xs"
                            type="button"
                            variant="outline"
                          >
                            {copiedInvitationId === invitation.id ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copiedInvitationId === invitation.id
                              ? 'Link copiado'
                              : 'Copiar para reenviar'}
                          </Button>
                        )}
                        {expired ? (
                          <Button
                            disabled={cancelInvitation.isPending}
                            onClick={() => void recreateInvitation(invitation)}
                            className="min-h-9 px-3 text-xs"
                            type="button"
                          >
                            <ExternalLink size={14} /> Refazer convite
                          </Button>
                        ) : (
                          <Button
                            className="min-h-9 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={cancelInvitation.isPending}
                            onClick={() => cancelInvitation.mutate(invitation.id)}
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 size={14} /> Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {!invitations.isLoading && !invitations.data?.length && (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Nenhum convite pendente.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
        {number}
      </span>
      <span>{text}</span>
    </li>
  )
}

function buildWhatsAppLink(phone: string, invitationLink: string) {
  const digits = phone.replace(/\D/g, '')
  const message = `Olá! Use este link para criar sua conta no Dedic e vincular seus treinos: ${invitationLink}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function buildInvitationLink(token: string) {
  return `${window.location.origin}/cadastro?convite=${token}`
}

function formatExpiration(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
