import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkoutShare } from '@/features/workouts/WorkoutShare'
import type { WorkoutSummary } from '@/features/workouts/workout-summary'

const base: WorkoutSummary = {
  name: 'Sexta - Pernas',
  finished_at: '2026-10-09T12:00:00Z',
  duration_seconds: 3600,
  sets: 12,
  volume_kg: 4200,
  week: { check_ins: 3, target: 5, met_now: false },
  new_achievements: [],
  records: 0,
  recorded_by_student: true,
}

let result: { data?: WorkoutSummary; isPending: boolean; isError: boolean }

vi.mock('@/features/workouts/workout-summary', () => ({
  useWorkoutSummary: () => result,
}))

beforeEach(() => {
  result = { data: base, isPending: false, isError: false }
})

describe('WorkoutShare', () => {
  it('abre o card sozinho quando há conquista, e "Agora não" fecha', async () => {
    result = {
      ...result,
      data: { ...base, week: { check_ins: 5, target: 5, met_now: true } },
    }
    render(<WorkoutShare isStudent studentName="Ana Aluna" workoutId="w1" />)

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'SEMANA BATIDA!' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: /Compartilhar|Baixar imagem/ }),
    ).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Agora não' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem conquista, não abre o card mas oferece o botão Compartilhar', () => {
    render(<WorkoutShare isStudent studentName="Ana Aluna" workoutId="w1" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeInTheDocument()
  })

  it('personal não vê botão nem card', () => {
    result = { ...result, data: { ...base, records: 2 } }
    render(<WorkoutShare isStudent={false} studentName="Ana Aluna" workoutId="w1" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).not.toBeInTheDocument()
  })

  it('com erro no resumo, avisa e não oferece compartilhar', () => {
    result = { data: undefined, isPending: false, isError: true }
    render(<WorkoutShare isStudent studentName="Ana Aluna" workoutId="w1" />)

    expect(
      screen.getByText('Não foi possível preparar o card deste treino.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).not.toBeInTheDocument()
  })
})
