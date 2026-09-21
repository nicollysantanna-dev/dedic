import type { Tables } from '@/lib/supabase/database.types'

export type ActivitySummary = Tables<'student_activity_summary'>

export type AlertKind =
  | 'overdue_payment'
  | 'low_credits'
  | 'inactive'
  | 'no_shows'
  | 'renewal_soon'
  | 'progress_stale'
  | 'goal_overdue'
  | 'workout_stale'

export type StudentAlert = { kind: AlertKind; label: string; severity: 'high' | 'medium' }

const dayMs = 86_400_000

/** Alertas objetivos por aluno, derivados do resumo de atividade (RF-21). */
export function buildStudentAlerts(
  summary: ActivitySummary,
  now = new Date(),
): StudentAlert[] {
  const alerts: StudentAlert[] = []
  const overdue = summary.overdue_payments ?? 0
  const balance = summary.balance ?? 0
  const noShows = summary.no_show_30d ?? 0
  const upcoming = summary.upcoming_count ?? 0
  const activeGoalsOverdue = summary.overdue_goals ?? 0

  if (overdue > 0) {
    alerts.push({
      kind: 'overdue_payment',
      label: 'Pagamento atrasado',
      severity: 'high',
    })
  }
  if (balance <= 0) {
    alerts.push({ kind: 'low_credits', label: 'Sem créditos', severity: 'high' })
  } else if (balance <= 1) {
    alerts.push({ kind: 'low_credits', label: 'Último crédito', severity: 'medium' })
  }

  const daysSinceLesson = summary.last_completed_at
    ? Math.floor((now.getTime() - new Date(summary.last_completed_at).getTime()) / dayMs)
    : null
  const daysSinceStart = summary.started_at
    ? Math.floor((now.getTime() - new Date(summary.started_at).getTime()) / dayMs)
    : 0
  const inactiveDays = daysSinceLesson ?? daysSinceStart
  if (upcoming === 0 && inactiveDays >= 14) {
    alerts.push({
      kind: 'inactive',
      label:
        daysSinceLesson === null ? 'Nenhuma aula ainda' : `${inactiveDays} dias sem aula`,
      severity: 'medium',
    })
  }
  if (noShows >= 2) {
    alerts.push({
      kind: 'no_shows',
      label: `${noShows} faltas no mês`,
      severity: 'medium',
    })
  }
  if (summary.next_renewal_on) {
    const daysToRenewal = Math.ceil(
      (new Date(`${summary.next_renewal_on}T00:00:00`).getTime() - now.getTime()) / dayMs,
    )
    if (daysToRenewal <= 7) {
      alerts.push({
        kind: 'renewal_soon',
        label: daysToRenewal < 0 ? 'Renovação vencida' : 'Renovação em breve',
        severity: 'medium',
      })
    }
  }
  const daysSinceProgress = summary.last_progress_on
    ? Math.floor(
        (now.getTime() - new Date(`${summary.last_progress_on}T00:00:00`).getTime()) /
          dayMs,
      )
    : null
  if ((daysSinceProgress ?? daysSinceStart) >= 30) {
    alerts.push({
      kind: 'progress_stale',
      label: 'Progresso desatualizado',
      severity: 'medium',
    })
  }
  if (activeGoalsOverdue > 0) {
    alerts.push({
      kind: 'goal_overdue',
      label: 'Meta com prazo vencido',
      severity: 'medium',
    })
  }
  // Só para quem já registrou treino: quem nunca usou não recebe cobrança.
  if (summary.last_workout_at) {
    const daysSinceWorkout = Math.floor(
      (now.getTime() - new Date(summary.last_workout_at).getTime()) / dayMs,
    )
    if (daysSinceWorkout >= 14) {
      alerts.push({
        kind: 'workout_stale',
        label: `${daysSinceWorkout} dias sem treino registrado`,
        severity: 'medium',
      })
    }
  }

  return alerts
}

/** Progresso da meta de frequência semanal, com base na média das últimas 4 semanas. */
export function attendanceGoalProgress(summary: ActivitySummary) {
  const target = summary.attendance_goal_per_week
  if (!target || Number(target) <= 0) return null
  const average = Number(summary.weekly_average_4w ?? 0)
  return Math.max(0, Math.min(100, Math.round((average / Number(target)) * 100)))
}
