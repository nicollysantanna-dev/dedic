import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CalendarClock, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageReveal } from '@/components/ui/motion'
import {
  formatLocalDateTime,
  formatTime,
  getWeekdayLabel,
} from '@/features/availability/date-utils'
import {
  availabilityExceptionSchema,
  availabilityRuleSchema,
  type AvailabilityExceptionValues,
  type AvailabilityRuleValues,
} from '@/features/availability/schemas'
import { useAuth } from '@/features/auth/auth-context'
import { requireSupabase } from '@/lib/supabase/client'

export function AvailabilityPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const trainerId = profile?.id ?? ''

  const ruleForm = useForm<AvailabilityRuleValues>({
    resolver: zodResolver(availabilityRuleSchema),
    defaultValues: { isoWeekday: 1, startTime: '08:00', endTime: '12:00' },
  })
  const exceptionForm = useForm<AvailabilityExceptionValues>({
    resolver: zodResolver(availabilityExceptionSchema),
    defaultValues: { startsAt: '', endsAt: '', reason: '' },
  })

  const rules = useQuery({
    queryKey: ['availability-rules', trainerId],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('availability_rules')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('active', true)
        .order('iso_weekday')
        .order('start_time')
      if (error) throw error
      return data
    },
  })

  const exceptions = useQuery({
    queryKey: ['availability-exceptions', trainerId],
    enabled: Boolean(trainerId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('availability_exceptions')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at')
      if (error) throw error
      return data
    },
  })

  const createRule = useMutation({
    mutationFn: async (values: AvailabilityRuleValues) => {
      const { error } = await requireSupabase().from('availability_rules').insert({
        trainer_id: trainerId,
        iso_weekday: values.isoWeekday,
        start_time: values.startTime,
        end_time: values.endTime,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability-rules', trainerId] })
    },
  })

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await requireSupabase()
        .from('availability_rules')
        .delete()
        .eq('id', ruleId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability-rules', trainerId] })
    },
  })

  const createException = useMutation({
    mutationFn: async (values: AvailabilityExceptionValues) => {
      const { error } = await requireSupabase()
        .from('availability_exceptions')
        .insert({
          trainer_id: trainerId,
          starts_at: new Date(values.startsAt).toISOString(),
          ends_at: new Date(values.endsAt).toISOString(),
          reason: values.reason || null,
        })
      if (error) throw error
    },
    onSuccess: () => {
      exceptionForm.reset()
      void queryClient.invalidateQueries({
        queryKey: ['availability-exceptions', trainerId],
      })
    },
  })

  const deleteException = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await requireSupabase()
        .from('availability_exceptions')
        .delete()
        .eq('id', exceptionId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['availability-exceptions', trainerId],
      })
    },
  })

  if (profile?.role !== 'trainer') return <Navigate to="/app" replace />

  return (
    <main className="min-h-dvh bg-[#f4f1e9] px-5 py-6 text-[#183529] sm:px-8">
      <PageReveal className="mx-auto w-full max-w-5xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          to="/app"
        >
          <ArrowLeft size={17} /> Voltar ao painel
        </Link>

        <header className="mt-7 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
            Sua agenda base
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
            Quando você atende?
          </h1>
          <p className="mt-3 leading-7 text-[#60746a]">
            Cadastre horários recorrentes e bloqueie exceções sem apagar sua rotina
            semanal.
          </p>
        </header>

        <div className="mt-9 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] bg-[#173d2c] p-6 text-white sm:p-7">
            <CalendarClock className="text-[#efc86f]" size={25} />
            <h2 className="font-display mt-4 text-2xl font-bold tracking-[-0.04em]">
              Disponibilidade semanal
            </h2>

            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                void ruleForm.handleSubmit((values) => createRule.mutate(values))(event)
              }}
            >
              <label className="text-sm font-semibold">
                Dia da semana
                <select
                  className="field mt-2 border-white/15 bg-white/10 text-white"
                  {...ruleForm.register('isoWeekday', { valueAsNumber: true })}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option className="text-[#183529]" key={day} value={day}>
                      {getWeekdayLabel(day)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <TimeField label="Início" registration={ruleForm.register('startTime')} />
                <TimeField
                  label="Fim"
                  registration={ruleForm.register('endTime')}
                  error={ruleForm.formState.errors.endTime?.message}
                />
              </div>

              {createRule.error && (
                <p className="text-xs text-[#f0c3a9]" role="alert">
                  Não foi possível adicionar. Verifique se este intervalo já existe.
                </p>
              )}

              <Button
                className="bg-[#d6a850] text-[#173326] hover:bg-[#e3bd69]"
                disabled={createRule.isPending}
                type="submit"
              >
                {createRule.isPending ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                Adicionar intervalo
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
              {rules.data?.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-2xl bg-white/8 p-4"
                >
                  <div>
                    <p className="font-semibold">{getWeekdayLabel(rule.iso_weekday)}</p>
                    <p className="mt-1 text-sm text-[#b9cdc1]">
                      {formatTime(rule.start_time)} — {formatTime(rule.end_time)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover intervalo de ${getWeekdayLabel(rule.iso_weekday)}`}
                    className="grid size-10 place-items-center rounded-full text-[#efc86f] hover:bg-white/10"
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              {!rules.isLoading && !rules.data?.length && (
                <p className="py-4 text-center text-sm text-[#b9cdc1]">
                  Nenhum horário cadastrado.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#173d2c]/8 bg-white/60 p-6 sm:p-7">
            <Ban className="text-[#a47b2e]" size={25} />
            <h2 className="font-display mt-4 text-2xl font-bold tracking-[-0.04em]">
              Bloquear um período
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#687b71]">
              Use para folgas, compromissos ou qualquer exceção à rotina.
            </p>

            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                void exceptionForm.handleSubmit((values) =>
                  createException.mutate(values),
                )(event)
              }}
            >
              <DateTimeField
                label="Início"
                error={exceptionForm.formState.errors.startsAt?.message}
                registration={exceptionForm.register('startsAt')}
              />
              <DateTimeField
                label="Fim"
                error={exceptionForm.formState.errors.endsAt?.message}
                registration={exceptionForm.register('endsAt')}
              />
              <label className="text-sm font-semibold">
                Motivo opcional
                <input
                  className="field mt-2"
                  maxLength={160}
                  {...exceptionForm.register('reason')}
                />
              </label>
              <Button
                variant="outline"
                disabled={createException.isPending}
                type="submit"
              >
                {createException.isPending && (
                  <LoaderCircle className="animate-spin" size={17} />
                )}
                Criar bloqueio
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t border-[#173d2c]/8 pt-5">
              {exceptions.data?.map((exception) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between rounded-2xl bg-[#eef1ea] p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {exception.reason || 'Período bloqueado'}
                    </p>
                    <p className="mt-1 text-xs text-[#718178]">
                      {formatLocalDateTime(exception.starts_at)} até{' '}
                      {formatLocalDateTime(exception.ends_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remover bloqueio"
                    className="grid size-10 place-items-center rounded-full text-[#8e483a] hover:bg-white"
                    onClick={() => deleteException.mutate(exception.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              {!exceptions.isLoading && !exceptions.data?.length && (
                <p className="py-4 text-center text-sm text-[#718178]">
                  Nenhum bloqueio futuro.
                </p>
              )}
            </div>
          </section>
        </div>
      </PageReveal>
    </main>
  )
}

function TimeField({
  label,
  error,
  registration,
}: {
  label: string
  error?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        className="field mt-2 border-white/15 bg-white/10 text-white"
        type="time"
        {...registration}
      />
      {error && <span className="mt-1 block text-xs text-[#f0c3a9]">{error}</span>}
    </label>
  )
}

function DateTimeField({
  label,
  error,
  registration,
}: {
  label: string
  error?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="field mt-2" type="datetime-local" {...registration} />
      {error && <span className="mt-1 block text-xs text-[#a04432]">{error}</span>}
    </label>
  )
}
