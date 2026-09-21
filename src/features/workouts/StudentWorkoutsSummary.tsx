import { Activity, Trophy } from 'lucide-react'

import { ExerciseRecordsSection } from '@/features/workouts/ExerciseRecordsSection'
import { WorkoutHistorySection } from '@/features/workouts/WorkoutHistorySection'
import type { ActivitySummary } from '@/features/students/student-alerts'
import { formatDateTime } from '@/lib/format'

/**
 * Treinos de um aluno no perfil do personal: ritmo (treinos em 30 dias vs. meta
 * de frequência), últimas sessões e principais recordes.
 */
export function StudentWorkoutsSummary({
  studentId,
  trainerId,
  summary,
}: {
  studentId: string
  trainerId: string
  summary: ActivitySummary
}) {
  const workouts30d = summary.workouts_30d ?? 0
  const perWeek = Math.round((workouts30d / 30) * 7 * 10) / 10
  const goal = summary.attendance_goal_per_week
  const adherence =
    goal && Number(goal) > 0
      ? Math.min(100, Math.round((perWeek / Number(goal)) * 100))
      : null

  return (
    <section className="mt-5">
      <h2 className="mb-3 text-lg font-bold">Treinos registrados</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Últimos 30 dias"
          value={`${workouts30d} treino${workouts30d === 1 ? '' : 's'}`}
          hint={`≈ ${perWeek.toLocaleString('pt-BR')} por semana`}
        />
        <Stat
          label="Aderência à meta"
          value={adherence === null ? 'Sem meta' : `${adherence}%`}
          hint={
            adherence === null
              ? 'Defina uma meta de frequência'
              : `meta: ${Number(goal).toLocaleString('pt-BR')}/semana`
          }
        />
        <Stat
          label="Último treino"
          value={
            summary.last_workout_at ? formatDateTime(summary.last_workout_at) : 'Nenhum'
          }
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Activity size={15} /> Últimas sessões
          </h3>
          <WorkoutHistorySection
            emptyMessage="Nenhum treino registrado ainda."
            limit={5}
            studentId={studentId}
          />
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Trophy size={15} /> Recordes
          </h3>
          <ExerciseRecordsSection limit={5} studentId={studentId} trainerId={trainerId} />
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
