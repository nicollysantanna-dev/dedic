import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CalendarClock, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
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
import { appointmentKeys } from '@/features/appointments/keys'
import { requireSupabase } from '@/lib/supabase/client'

export function AvailabilityPanel({ trainerId }: { trainerId: string }) {
  const queryClient = useQueryClient()
  const invalidateAgenda = () => {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.allSlots })
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.allBlocks })
  }

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
      invalidateAgenda()
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
      invalidateAgenda()
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
      invalidateAgenda()
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
      invalidateAgenda()
    },
  })

  return (
    <div className="mt-7 space-y-8">
      <section>
        <div className="flex items-center gap-2">
          <CalendarClock className="text-[var(--brand)]" size={20} />
          <h3 className="text-base font-bold">Horários semanais</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Seus alunos só conseguem agendar dentro destes intervalos.
        </p>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            void ruleForm.handleSubmit((values) => createRule.mutate(values))(event)
          }}
        >
          <label className="block text-sm font-semibold">
            Dia da semana
            <select
              className="field mt-2"
              {...ruleForm.register('isoWeekday', { valueAsNumber: true })}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  {getWeekdayLabel(day)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Início"
              type="time"
              registration={ruleForm.register('startTime')}
            />
            <Field
              label="Fim"
              type="time"
              registration={ruleForm.register('endTime')}
              error={ruleForm.formState.errors.endTime?.message}
            />
          </div>
          {createRule.error && (
            <PanelError text="Não foi possível adicionar. Verifique se este intervalo já existe." />
          )}
          <Button disabled={createRule.isPending} type="submit" variant="outline">
            {createRule.isPending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Plus size={17} />
            )}
            Adicionar intervalo
          </Button>
        </form>

        <ul className="mt-4 space-y-2">
          {rules.isLoading && <ListNote text="Carregando horários…" />}
          {rules.error && <PanelError text="Não foi possível carregar seus horários." />}
          {rules.data?.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold">{getWeekdayLabel(rule.iso_weekday)}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {formatTime(rule.start_time)} — {formatTime(rule.end_time)}
                </p>
              </div>
              <RemoveButton
                label={`Remover intervalo de ${getWeekdayLabel(rule.iso_weekday)}`}
                onClick={() => deleteRule.mutate(rule.id)}
                pending={deleteRule.isPending && deleteRule.variables === rule.id}
              />
            </li>
          ))}
          {!rules.isLoading && !rules.error && !rules.data?.length && (
            <ListNote text="Nenhum horário cadastrado. Sem intervalos, os alunos não conseguem agendar sozinhos." />
          )}
          {deleteRule.error && (
            <PanelError text="Não foi possível remover o intervalo." />
          )}
        </ul>
      </section>

      <section className="border-t border-slate-100 pt-7">
        <div className="flex items-center gap-2">
          <Ban className="text-red-500" size={20} />
          <h3 className="text-base font-bold">Bloqueios</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Folgas, compromissos ou qualquer exceção à rotina.
        </p>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            void exceptionForm.handleSubmit((values) => createException.mutate(values))(
              event,
            )
          }}
        >
          <Field
            label="Início"
            type="datetime-local"
            error={exceptionForm.formState.errors.startsAt?.message}
            registration={exceptionForm.register('startsAt')}
          />
          <Field
            label="Fim"
            type="datetime-local"
            error={exceptionForm.formState.errors.endsAt?.message}
            registration={exceptionForm.register('endsAt')}
          />
          <label className="block text-sm font-semibold">
            Motivo (opcional)
            <input
              className="field mt-2"
              maxLength={160}
              {...exceptionForm.register('reason')}
            />
          </label>
          {createException.error && (
            <PanelError text="Não foi possível criar o bloqueio. Tente novamente." />
          )}
          <Button disabled={createException.isPending} type="submit" variant="outline">
            {createException.isPending ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Ban size={17} />
            )}
            Criar bloqueio
          </Button>
        </form>

        <ul className="mt-4 space-y-2">
          {exceptions.isLoading && <ListNote text="Carregando bloqueios…" />}
          {exceptions.error && (
            <PanelError text="Não foi possível carregar seus bloqueios." />
          )}
          {exceptions.data?.map((exception) => (
            <li
              key={exception.id}
              className="flex items-center justify-between rounded-2xl bg-red-50 p-4"
            >
              <div>
                <p className="font-semibold">{exception.reason || 'Período bloqueado'}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatLocalDateTime(exception.starts_at)} até{' '}
                  {formatLocalDateTime(exception.ends_at)}
                </p>
              </div>
              <RemoveButton
                label="Remover bloqueio"
                onClick={() => deleteException.mutate(exception.id)}
                pending={
                  deleteException.isPending && deleteException.variables === exception.id
                }
              />
            </li>
          ))}
          {!exceptions.isLoading && !exceptions.error && !exceptions.data?.length && (
            <ListNote text="Nenhum bloqueio futuro." />
          )}
          {deleteException.error && (
            <PanelError text="Não foi possível remover o bloqueio." />
          )}
        </ul>
      </section>
    </div>
  )
}

function Field({
  label,
  type,
  error,
  registration,
}: {
  label: string
  type: 'time' | 'datetime-local'
  error?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-2" type={type} {...registration} />
      {error && (
        <span className="mt-1 block text-xs text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

function RemoveButton({
  label,
  onClick,
  pending,
}: {
  label: string
  onClick: () => void
  pending: boolean
}) {
  return (
    <button
      aria-label={label}
      className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
      disabled={pending}
      onClick={onClick}
      type="button"
    >
      {pending ? (
        <LoaderCircle className="animate-spin" size={17} />
      ) : (
        <Trash2 size={17} />
      )}
    </button>
  )
}

function ListNote({ text }: { text: string }) {
  return <li className="py-3 text-center text-sm text-slate-500">{text}</li>
}

function PanelError({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-900" role="alert">
      {text}
    </p>
  )
}
