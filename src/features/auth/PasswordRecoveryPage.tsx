import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Dumbbell, LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

const requestSchema = z.object({ email: z.email('Informe um e-mail válido.') })
const newPasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'As senhas não coincidem.',
  })

/** Pede o e-mail e envia o link de redefinição. */
export function PasswordRecoveryPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')
  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  })

  const submit = form.handleSubmit(async ({ email }) => {
    setServerError('')
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    if (error) {
      setServerError('Não foi possível enviar o e-mail agora. Tente novamente.')
      return
    }
    setSent(true)
  })

  return (
    <AuthShell
      title="Recuperar acesso"
      description="Informe o e-mail da sua conta. Você receberá um link para criar uma nova senha."
    >
      {sent ? (
        <p
          className="mt-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-950"
          role="status"
        >
          Se existir uma conta com este e-mail, o link de redefinição foi enviado.
          Verifique também a caixa de spam.
        </p>
      ) : (
        <form
          className="mt-7 space-y-4"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <Field label="E-mail" error={form.formState.errors.email?.message}>
            <input
              className="field"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
          </Field>
          {serverError && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {serverError}
            </p>
          )}
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting && (
              <LoaderCircle className="animate-spin" size={17} />
            )}
            Enviar link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

/** Destino do link de recuperação: a sessão temporária permite trocar a senha. */
export function NewPasswordPage() {
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const form = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmation: '' },
  })

  const submit = form.handleSubmit(async ({ password }) => {
    setServerError('')
    const { error } = await requireSupabase().auth.updateUser({ password })
    if (error) {
      setServerError('Não foi possível salvar a nova senha. Peça um novo link.')
      return
    }
    void navigate('/app', { replace: true })
  })

  return (
    <AuthShell title="Nova senha" description="Escolha uma senha nova para a sua conta.">
      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Validando o link…</p>
      ) : !session ? (
        <p
          className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Este link expirou ou já foi usado.{' '}
          <Link className="font-bold underline" to="/recuperar">
            Peça um novo link
          </Link>
          .
        </p>
      ) : (
        <form
          className="mt-7 space-y-4"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <Field label="Nova senha" error={form.formState.errors.password?.message}>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
          <Field
            label="Confirmar senha"
            error={form.formState.errors.confirmation?.message}
          >
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmation')}
            />
          </Field>
          {serverError && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {serverError}
            </p>
          )}
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting && (
              <LoaderCircle className="animate-spin" size={17} />
            )}
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="min-h-dvh bg-[var(--app-bg)] px-4 py-6 text-white sm:grid sm:place-items-center sm:px-5">
      <section className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar para entrar
        </Link>
        <div className="mt-6 rounded-[1.75rem] bg-white p-6 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-white">
            <Dumbbell size={21} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          {children}
        </div>
      </section>
    </main>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-2 block">{children}</span>
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
