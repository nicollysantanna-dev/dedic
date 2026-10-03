import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GoalActions } from '@/features/progress/GoalActions'
import type { GoalWithExercise } from '@/features/progress/queries'

const updateGoal = vi.fn()
const deleteGoal = vi.fn()

vi.mock('@/features/progress/queries', () => ({
  useUpdateGoal: () => ({ mutate: updateGoal, isPending: false, error: null }),
  useDeleteGoal: () => ({ mutate: deleteGoal, isPending: false, error: null }),
}))

const goal: GoalWithExercise = {
  id: 'goal-1',
  trainer_id: 'trainer-1',
  student_id: 'student-1',
  kind: 'weight',
  exercise_id: null,
  initial_value: 68.4,
  target_value: 64,
  target_date: '2026-12-31',
  status: 'active',
  created_by: 'trainer-1',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  exercise: null,
}

describe('GoalActions', () => {
  beforeEach(() => {
    updateGoal.mockReset()
    deleteGoal.mockReset()
  })

  it('edita valor-alvo e prazo da meta', async () => {
    render(<GoalActions goal={goal} studentId="student-1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Editar meta' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar meta' })
    const target = within(dialog).getByLabelText('Valor-alvo')
    expect(target).toHaveValue('64')
    await userEvent.clear(target)
    await userEvent.type(target, '63,5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar meta' }))

    expect(updateGoal).toHaveBeenCalledWith(
      { goalId: 'goal-1', targetValue: 63.5, targetDate: '2026-12-31' },
      expect.anything(),
    )
  })

  it('não salva valor-alvo igual ao inicial', async () => {
    render(<GoalActions goal={goal} studentId="student-1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Editar meta' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar meta' })
    const target = within(dialog).getByLabelText('Valor-alvo')
    await userEvent.clear(target)
    await userEvent.type(target, '68,4')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar meta' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'O valor-alvo precisa ser diferente do valor inicial.',
    )
    expect(updateGoal).not.toHaveBeenCalled()
  })

  it('exclui a meta só depois de confirmar', async () => {
    render(<GoalActions goal={goal} studentId="student-1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Excluir meta' }))
    expect(deleteGoal).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(deleteGoal).toHaveBeenCalledWith('goal-1', expect.anything())
  })
})
