/** Cálculos puros de uma sessão de treino. */

export type CompletedSet = { weightKg: number | null; reps: number | null }

/** Volume total (kg × repetições) das séries concluídas. */
export function totalVolume(sets: readonly CompletedSet[]) {
  return sets.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0)
}

/** 1RM estimado pela fórmula de Epley; para 1 repetição é a própria carga. */
export function estimateOneRepMax(weightKg: number, reps: number) {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}min`
  if (minutes > 0) return `${minutes}min ${String(rest).padStart(2, '0')}s`
  return `${rest}s`
}

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatKg(value: number) {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
}
