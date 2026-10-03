import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  emptyProgressEntryForm,
  entryToFormValues,
  parseProgressEntryForm,
  type ProgressEntryFormValues,
} from '@/features/progress/progress-entry-form'
import { measurementFields } from '@/features/progress/progress-summary'
import {
  useAddProgressEntry,
  useUpdateProgressEntry,
  type ProgressEntryWithAuthor,
} from '@/features/progress/queries'
import { toIsoDate } from '@/lib/format'

type Mode =
  | { kind: 'create'; recordedBy: string }
  | { kind: 'edit'; entry: ProgressEntryWithAuthor }

/** Registro de peso e medidas: cria um novo ou edita um existente. */
export function ProgressEntryDialog({
  studentId,
  mode,
  onClose,
}: {
  studentId: string
  mode: Mode
  onClose: () => void
}) {
  const today = toIsoDate(new Date())
  const [values, setValues] = useState<ProgressEntryFormValues>(() =>
    mode.kind === 'edit' ? entryToFormValues(mode.entry) : emptyProgressEntryForm(today),
  )
  const [formError, setFormError] = useState('')
  const add = useAddProgressEntry(studentId)
  const update = useUpdateProgressEntry(studentId)
  const mutation = mode.kind === 'edit' ? update : add
  const set = <K extends keyof ProgressEntryFormValues>(
    key: K,
    value: ProgressEntryFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const parsed = parseProgressEntryForm(values)
    if (!parsed.ok) {
      setFormError(parsed.error)
      return
    }
    if (mode.kind === 'edit') {
      update.mutate({ entryId: mode.entry.id, ...parsed.value }, { onSuccess: onClose })
    } else {
      add.mutate({ ...parsed.value, recordedBy: mode.recordedBy }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog
      title={mode.kind === 'edit' ? 'Editar registro' : 'Registrar peso e medidas'}
      eyebrow="Evolução"
      onClose={onClose}
      pending={mutation.isPending}
    >
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Data
            <input
              className="field mt-2"
              max={today}
              onChange={(event) => set('recordedOn', event.target.value)}
              required
              type="date"
              value={values.recordedOn}
            />
          </label>
          <label className="block text-sm font-semibold">
            Peso (kg)
            <input
              className="field mt-2"
              inputMode="decimal"
              onChange={(event) => set('weight', event.target.value)}
              placeholder="Ex.: 68,5"
              value={values.weight}
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Medidas (cm, opcionais)</legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {measurementFields.map((field) => (
              <label
                key={field.key}
                className="block text-xs font-semibold text-slate-600"
              >
                {field.label}
                <input
                  className="field mt-1"
                  inputMode="decimal"
                  onChange={(event) =>
                    set('measurements', {
                      ...values.measurements,
                      [field.key]: event.target.value,
                    })
                  }
                  value={values.measurements[field.key]}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          Observação (opcional)
          <input
            className="field mt-2"
            maxLength={240}
            onChange={(event) => set('note', event.target.value)}
            value={values.note}
          />
        </label>
        {(formError || mutation.error) && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {formError || 'Não foi possível salvar o registro. Tente novamente.'}
          </p>
        )}
        <Button className="w-full" disabled={mutation.isPending} type="submit">
          {mutation.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Salvar registro
        </Button>
      </form>
    </Dialog>
  )
}
