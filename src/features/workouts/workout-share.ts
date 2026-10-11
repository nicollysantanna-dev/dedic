import { achievementName } from '@/features/gamification/achievement-catalog'
import type { WorkoutSummary } from '@/features/workouts/workout-summary'

export type WorkoutShareTitle =
  'MEDALHA NOVA!' | 'SEMANA BATIDA!' | 'RECORDE!' | 'TREINO FEITO'

/** Título do card pela conquista principal: medalha > semana > recorde. */
export function workoutShareTitle(summary: WorkoutSummary): WorkoutShareTitle {
  if (summary.new_achievements.length > 0) return 'MEDALHA NOVA!'
  if (summary.week.met_now) return 'SEMANA BATIDA!'
  if (summary.records > 0) return 'RECORDE!'
  return 'TREINO FEITO'
}

/** Todas as conquistas do treino numa linha, ex.: "Sequência 4 · Semana 5 de 5 · 2 recordes". */
export function workoutAchievementsLine(summary: WorkoutSummary): string {
  const parts = summary.new_achievements.map(achievementName)
  if (summary.week.met_now) {
    parts.push(`Semana ${summary.week.check_ins} de ${summary.week.target}`)
  }
  if (summary.records > 0) {
    parts.push(`${summary.records} ${summary.records === 1 ? 'recorde' : 'recordes'}`)
  }
  return parts.join(' · ')
}

/** Basta uma conquista para o card abrir sozinho. */
export function hasWorkoutAchievement(summary: WorkoutSummary): boolean {
  return (
    summary.new_achievements.length > 0 || summary.week.met_now || summary.records > 0
  )
}
