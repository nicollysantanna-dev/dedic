import type { Ref } from 'react'

import { formatDuration, formatKg } from '@/features/workouts/workout-math'
import {
  workoutAchievementsLine,
  workoutShareTitle,
} from '@/features/workouts/workout-share'
import type { WorkoutSummary } from '@/features/workouts/workout-summary'

/** Primeiro e último nome, como no card do mês. */
function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : (parts[0] ?? '')
}

function formatWorkoutDate(finishedAt: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(finishedAt))
}

/**
 * Card 1080×1920 do treino, no mesmo visual do card do mês. Renderizado fora da
 * tela e convertido em PNG; sem lista de exercícios, peso corporal ou fotos.
 */
export function WorkoutShareCard({
  summary,
  studentName,
  cardRef,
}: {
  summary: WorkoutSummary
  studentName: string
  cardRef: Ref<HTMLDivElement>
}) {
  const achievements = workoutAchievementsLine(summary)
  const stats = [
    { label: 'duração', value: formatDuration(summary.duration_seconds) },
    { label: 'volume', value: formatKg(summary.volume_kg) },
    { label: 'séries', value: String(summary.sets) },
  ]

  return (
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1920,
        background: '#090f1f',
        color: '#ffffff',
        fontFamily: 'ui-monospace, Menlo, monospace',
        padding: '120px 96px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 40, letterSpacing: 8, margin: 0, color: '#93c5fd' }}>DEDIC</p>

      <div
        style={{
          marginTop: 56,
          width: '100%',
          background: '#2f6fed',
          padding: '40px 0',
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: 6,
        }}
      >
        {workoutShareTitle(summary)}
      </div>

      <p style={{ fontSize: 52, fontWeight: 700, margin: '72px 0 0' }}>{summary.name}</p>
      <p style={{ fontSize: 36, color: '#cbd5e1', margin: '20px 0 0' }}>
        {formatWorkoutDate(summary.finished_at)}
      </p>
      <p style={{ fontSize: 42, fontWeight: 700, margin: '12px 0 0' }}>
        {shortName(studentName)}
      </p>

      <div style={{ marginTop: 96, display: 'grid', gap: 56, width: '100%' }}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <p style={{ fontSize: 120, fontWeight: 800, margin: 0, lineHeight: 1 }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 36, color: '#22c55e', margin: '12px 0 0' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {achievements && (
        <p style={{ marginTop: 80, fontSize: 40, color: '#facc15', lineHeight: 1.4 }}>
          {achievements}
        </p>
      )}

      <p style={{ marginTop: 'auto', fontSize: 34, color: '#cbd5e1' }}>
        {summary.week.check_ins} de {summary.week.target} check-ins nesta semana
      </p>
      <p style={{ marginTop: 24, fontSize: 40, color: '#e2e8f0' }}>
        Um treino de cada vez.
      </p>
    </div>
  )
}
