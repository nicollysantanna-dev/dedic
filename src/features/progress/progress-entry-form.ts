import {
  measurementFields,
  type MeasurementKey,
} from '@/features/progress/progress-summary'
import type { Json, Tables } from '@/lib/supabase/database.types'

export type ProgressEntryFormValues = {
  recordedOn: string
  weight: string
  measurements: Record<MeasurementKey, string>
  note: string
}

export type ProgressEntryInput = {
  recordedOn: string
  weightKg: number | null
  measurements: Record<string, number>
  note: string
}

type ParseResult = { ok: true; value: ProgressEntryInput } | { ok: false; error: string }

const emptyMeasurements = (): Record<MeasurementKey, string> => ({
  chest_cm: '',
  waist_cm: '',
  hips_cm: '',
  arm_cm: '',
  thigh_cm: '',
})

export function emptyProgressEntryForm(today: string): ProgressEntryFormValues {
  return { recordedOn: today, weight: '', measurements: emptyMeasurements(), note: '' }
}

const toNumber = (raw: string) => Number(raw.replace(',', '.'))
const toInput = (value: number) => String(value).replace('.', ',')

/** Valida o formulário de peso e medidas; mesma regra para criar e editar. */
export function parseProgressEntryForm(values: ProgressEntryFormValues): ParseResult {
  const parsedMeasurements: Record<string, number> = {}
  for (const field of measurementFields) {
    const raw = values.measurements[field.key]
    if (!raw) continue
    const value = toNumber(raw)
    if (!Number.isFinite(value) || value <= 0 || value > 300) {
      return {
        ok: false,
        error: `Informe uma medida válida para ${field.label.toLowerCase()}.`,
      }
    }
    parsedMeasurements[field.key] = value
  }

  const weightKg = values.weight ? toNumber(values.weight) : null
  if (
    weightKg !== null &&
    (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400)
  ) {
    return { ok: false, error: 'Informe um peso entre 20 e 400 kg.' }
  }
  if (weightKg === null && Object.keys(parsedMeasurements).length === 0) {
    return { ok: false, error: 'Informe o peso ou pelo menos uma medida.' }
  }

  return {
    ok: true,
    value: {
      recordedOn: values.recordedOn,
      weightKg,
      measurements: parsedMeasurements,
      note: values.note,
    },
  }
}

export function entryToFormValues(
  entry: Pick<
    Tables<'progress_entries'>,
    'recorded_on' | 'weight_kg' | 'measurements' | 'note'
  >,
): ProgressEntryFormValues {
  const saved = (entry.measurements ?? {}) as Record<string, Json>
  const measurements = emptyMeasurements()
  for (const field of measurementFields) {
    const value = saved[field.key]
    if (typeof value === 'number') measurements[field.key] = toInput(value)
  }
  return {
    recordedOn: entry.recorded_on,
    weight: entry.weight_kg === null ? '' : toInput(Number(entry.weight_kg)),
    measurements,
    note: entry.note ?? '',
  }
}
