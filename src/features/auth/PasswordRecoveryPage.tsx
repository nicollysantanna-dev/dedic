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
        <p className="mt-6 rounded-2xl bg-[#e9e1ce] px-4 py-3 text-sm" role="status">
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
              className="rounded-2xl bg-[#f2ded7] px-4 py-3 text-sm text-[#8e483a]"
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
        <p className="mt-6 text-sm text-[#65786e]">Validando o link…</p>
      ) : !session ? (
        <p
          className="mt-6 rounded-2xl bg-[#f2ded7] px-4 py-3 text-sm text-[#8e483a]"
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
              className="rounded-2xl bg-[#f2ded7] px-4 py-3 text-sm text-[#8e483a]"
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
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850]"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar para entrar
        </Link>
        <div className="mt-8 rounded-[2rem] border border-[#173d2c]/8 bg-white/65 p-6 shadow-[0_24px_70px_rgba(24,53,41,0.1)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#173d2c] text-white">
            <Dumbbell size={21} aria-hidden="true" />
          </span>
          <h1 className="font-display mt-6 text-4xl font-bold tracking-[-0.055em]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#65786e]">{description}</p>
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
        <span className="mt-1 block text-xs font-medium text-[#a04432]" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
