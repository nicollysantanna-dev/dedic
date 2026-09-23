import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { LoaderCircle, X } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { AvatarPicker } from '@/features/account/AvatarPicker'
import { profileSchema, type ProfileValues } from '@/features/account/schemas'
import type { Profile } from '@/features/auth/types'
import {
  formatPhoneInput,
  normalizeBrazilianPhone,
} from '@/features/students/invitation-contact'
import { requireSupabase } from '@/lib/supabase/client'

const durationOptions = [30, 45, 60, 75, 90]

export function EditProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const isTrainer = profile.role === 'trainer'
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name,
      phone: profile.phone ? formatPhoneInput(profile.phone.replace(/^\+55/, '')) : '',
      defaultLessonDurationMinutes: profile.default_lesson_duration_minutes ?? undefined,
      role: profile.role,
    },
  })

  const save = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const { error } = await requireSupabase().rpc('update_own_profile', {
        requested_full_name: values.fullName,
        requested_phone: values.phone ? normalizeBrazilianPhone(values.phone) : undefined,
        requested_lesson_duration_minutes: isTrainer
          ? values.defaultLessonDurationMinutes
          : undefined,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })

  const phoneField = form.register('phone')

  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !save.isPending) onClose()
      }}
    >
      <section
        aria-labelledby="edit-profile-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 text-slate-950 shadow-2xl sm:max-w-lg sm:rounded-[1.75rem] sm:p-6"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Sua conta
            </p>
            <h2
              className="mt-1 text-2xl font-bold tracking-[-0.04em]"
              id="edit-profile-title"
            >
              Editar perfil
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            disabled={save.isPending}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>

        <div className="mt-5">
          <AvatarPicker
            avatarPath={profile.avatar_path}
            onChanged={onSaved}
            userId={profile.id}
          />
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            void form.handleSubmit((values) => save.mutate(values))(event)
          }}
        >
          <label className="block text-sm font-semibold">
            Nome completo
            <input
              className="field mt-2"
              maxLength={100}
              {...form.register('fullName')}
            />
            <FieldError message={form.formState.errors.fullName?.message} />
          </label>
          <label className="block text-sm font-semibold">
            Celular
            <input
              className="field mt-2"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              {...phoneField}
              onChange={(event) => {
                event.target.value = formatPhoneInput(event.target.value)
                void phoneField.onChange(event)
              }}
            />
            <FieldError message={form.formState.errors.phone?.message} />
          </label>
          {isTrainer && (
            <label className="block text-sm font-semibold">
              Duração padrão da aula
              <select
                className="field mt-2"
                {...form.register('defaultLessonDurationMinutes', {
                  valueAsNumber: true,
                })}
              >
                {durationOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </select>
              <FieldError
                message={form.formState.errors.defaultLessonDurationMinutes?.message}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Usada para gerar os horários disponíveis e calcular conflitos.
              </span>
            </label>
          )}

          {save.error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              Não foi possível salvar o perfil. Verifique os dados e tente novamente.
            </p>
          )}

          <Button className="w-full" disabled={save.isPending} type="submit">
            {save.isPending && <LoaderCircle className="animate-spin" size={17} />}
            Salvar perfil
          </Button>
        </form>
      </section>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className="mt-1 block text-xs font-normal text-red-700" role="alert">
      {message}
    </span>
  )
}
