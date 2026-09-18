import type { Tables } from '@/lib/supabase/database.types'

export type ProgressEntry = Pick<
  Tables<'progress_entries'>,
  'id' | 'recorded_on' | 'weight_kg' | 'measurements' | 'created_at'
>
export type Goal = Pick<
  Tables<'student_goals'>,
  'id' | 'kind' | 'initial_value' | 'target_value' | 'target_date' | 'status'
>

export const measurementFields = [
  { key: 'chest_cm', label: 'Peito' },
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'hips_cm', label: 'Quadril' },
  { key: 'arm_cm', label: 'Braço' },
  { key: 'thigh_cm', label: 'Coxa' },
] as const

export type MeasurementKey = (typeof measurementFields)[number]['key']

/** Série para o gráfico: um ponto por dia, usando o último registro com peso do dia. */
export function buildWeightSeries(entries: readonly ProgressEntry[]) {
  const byDay = new Map<string, number>()
  const ordered = [...entries].sort((left, right) =>
    left.recorded_on === right.recorded_on
      ? left.created_at.localeCompare(right.created_at)
      : left.recorded_on.localeCompare(right.recorded_on),
  )
  for (const entry of ordered) {
    if (entry.weight_kg !== null) byDay.set(entry.recorded_on, Number(entry.weight_kg))
  }
  return [...byDay.entries()].map(([date, weightKg]) => ({ date, weightKg }))
}

/** Última medida registrada para cada campo (medidas podem vir de registros diferentes). */
export function latestMeasurements(entries: readonly ProgressEntry[]) {
  const ordered = [...entries].sort((left, right) =>
    left.recorded_on === right.recorded_on
      ? right.created_at.localeCompare(left.created_at)
      : right.recorded_on.localeCompare(left.recorded_on),
  )
  const result: Partial<Record<MeasurementKey, { value: number; date: string }>> = {}
  for (const entry of ordered) {
    const measurements = entry.measurements as Record<string, unknown>
    for (const field of measurementFields) {
      const value = measurements[field.key]
      if (result[field.key] === undefined && typeof value === 'number') {
        result[field.key] = { value, date: entry.recorded_on }
      }
    }
  }
  return result
}

/** Progresso de uma meta em porcentagem (0–100), dado o valor atual. */
export function goalProgress(goal: Goal, currentValue: number | null) {
  if (currentValue === null) return 0
  const initial = Number(goal.initial_value)
  const target = Number(goal.target_value)
  const span = target - initial
  if (span === 0) return 100
  const done = (currentValue - initial) / span
  return Math.max(0, Math.min(100, Math.round(done * 100)))
}

export function daysUntil(date: string, now = new Date()) {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
