import type { MonthlyReport } from '@/features/gamification/schemas'

type Achievement = MonthlyReport['achievements'][number]

// Da mais rara para a mais comum (ADR 0013); o card mostra as primeiras do mês.
const rarityOrder = [
  'full_month',
  'comeback',
  'early_bird',
  'streak_12',
  'check_ins_100',
  'lessons_100',
  'streak_8',
  'check_ins_50',
  'lessons_50',
  'streak_4',
  'check_ins_10',
  'lessons_10',
  'first_check_in',
]

/** Título do card: "MÊS COMPLETO!" quando o mês ganhou a medalha de mês completo. */
export function shareTitle(report: MonthlyReport): string {
  const fullMonth = report.achievements.some(
    (achievement) =>
      achievement.code === 'full_month' &&
      achievement.period_start?.slice(0, 7) === report.month,
  )
  return fullMonth ? 'MÊS COMPLETO!' : 'RESUMO DO MÊS'
}

/** "N de M semanas batidas · meta Xx por semana", com as semanas do mês. */
export function shareSubtitle(report: MonthlyReport): string {
  const met = report.weeks.filter((week) => week.met).length
  const target = report.weeks[0]?.target ?? 3
  return `${met} de ${report.weeks.length} semanas batidas · meta ${target}x por semana`
}

/** Medalhas conquistadas no mês, das mais raras para as mais comuns, no máximo três. */
export function rarestMedals(achievements: Achievement[], month: string): Achievement[] {
  return achievements
    .filter((achievement) =>
      achievement.period_start
        ? achievement.period_start.slice(0, 7) === month
        : achievement.earned_at.slice(0, 7) === month,
    )
    .sort((a, b) => rarityOrder.indexOf(a.code) - rarityOrder.indexOf(b.code))
    .slice(0, 3)
}

export function shareFileName(month: string): string {
  return `dedic-resumo-${month}.png`
}
