import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Dumbbell, LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { authPathWithInvitation } from '@/features/auth/invitation-session'
import {
  loginSchema,
  signUpSchema,
  type LoginValues,
  type SignUpValues,
} from '@/features/auth/schemas'
import { requireSupabase } from '@/lib/supabase/client'

type AuthPageProps = {
  mode: 'login' | 'signup'
}

export function AuthPage({ mode }: AuthPageProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSignUp = mode === 'signup'

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'student',
      defaultLessonDurationMinutes: 60,
    },
  })
  const role = useWatch({ control: signUpForm.control, name: 'role' })

  if (session) return <Navigate to="/app" replace />

  const submitLogin = loginForm.handleSubmit(async (values: LoginValues) => {
    setIsSubmitting(true)
    setServerMessage(null)

    const { error } = await requireSupabase().auth.signInWithPassword(values)
    setIsSubmitting(false)

    if (error) {
      setServerMessage('Não foi possível entrar. Confira seu e-mail e senha.')
      return
    }

    void navigate('/app')
  })

  const submitSignUp = signUpForm.handleSubmit(async (values: SignUpValues) => {
    setIsSubmitting(true)
    setServerMessage(null)

    const { data, error } = await requireSupabase().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          phone: values.phone,
          role: values.role,
          default_lesson_duration_minutes:
            values.role === 'trainer' ? values.defaultLessonDurationMinutes : null,
        },
      },
    })

    setIsSubmitting(false)

    if (error) {
      setServerMessage(error.message)
      return
    }

    if (!data.session) {
      setServerMessage('Cadastro criado. Confirme seu e-mail para entrar no Dedic.')
      return
    }

    void navigate('/app')
  })

  const emailError = isSignUp
    ? signUpForm.formState.errors.email?.message
    : loginForm.formState.errors.email?.message
  const passwordError = isSignUp
    ? signUpForm.formState.errors.password?.message
    : loginForm.formState.errors.password?.message

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] px-4 py-6 text-white sm:grid sm:place-items-center sm:px-5">
      <section className="mx-auto w-full max-w-md">
        {isSignUp && (
          <Link
            to={authPathWithInvitation('/', location.search)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Voltar para entrar
          </Link>
        )}

        <div
          className={`${isSignUp ? 'mt-6' : 'mt-10'} rounded-[1.75rem] bg-white p-6 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8`}
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-white">
            <Dumbbell size={21} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {isSignUp ? 'Crie seu espaço.' : 'Que bom ter você de volta.'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isSignUp
              ? 'Escolha como você vai usar o Dedic. Esse papel não poderá ser trocado no MVP.'
              : 'Entre para acompanhar sua agenda e seus créditos.'}
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              void (isSignUp ? submitSignUp(event) : submitLogin(event))
            }}
            noValidate
          >
            {isSignUp && (
              <>
                <Field
                  label="Nome completo"
                  error={signUpForm.formState.errors.fullName?.message}
                >
                  <input
                    className="field"
                    autoComplete="name"
                    {...signUpForm.register('fullName')}
                  />
                </Field>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Quero usar como</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'student', label: 'Aluno' },
                      { value: 'trainer', label: 'Personal' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition ${
                          role === option.value
                            ? 'border-[var(--brand)] bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          value={option.value}
                          {...signUpForm.register('role')}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {role === 'trainer' && (
                  <Field
                    label="Duração padrão da aula"
                    error={
                      signUpForm.formState.errors.defaultLessonDurationMinutes?.message
                    }
                  >
                    <select
                      className="field"
                      {...signUpForm.register('defaultLessonDurationMinutes', {
                        setValueAs: (value: string) => Number(value),
                      })}
                    >
                      {[30, 45, 60, 75, 90].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutos
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            <Field label="E-mail" error={emailError}>
              <input
                className="field"
                type="email"
                autoComplete="email"
                {...(isSignUp
                  ? signUpForm.register('email')
                  : loginForm.register('email'))}
              />
            </Field>

            <Field label="Senha" error={passwordError}>
              <input
                className="field"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                {...(isSignUp
                  ? signUpForm.register('password')
                  : loginForm.register('password'))}
              />
            </Field>

            {!isSignUp && (
              <p className="text-right text-sm">
                <Link
                  className="font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 hover:text-[var(--brand-hover)]"
                  to="/recuperar"
                >
                  Esqueci minha senha
                </Link>
              </p>
            )}

            {serverMessage && (
              <p
                className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-950"
                role="status"
              >
                {serverMessage}
              </p>
            )}

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting && <LoaderCircle className="animate-spin" size={17} />}
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignUp ? 'Já possui conta?' : 'Ainda não possui conta?'}{' '}
            <Link
              className="font-bold text-[var(--brand)] underline decoration-2 underline-offset-4 hover:text-[var(--brand-hover)]"
              to={authPathWithInvitation(isSignUp ? '/' : '/cadastro', location.search)}
            >
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </Link>
          </p>
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
