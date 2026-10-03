import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProgressEntriesList } from '@/features/progress/ProgressEntriesList'
import type { ProgressEntryWithAuthor } from '@/features/progress/queries'

const updateEntry = vi.fn()
const deleteEntry = vi.fn()

vi.mock('@/features/progress/queries', () => ({
  useAddProgressEntry: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateProgressEntry: () => ({ mutate: updateEntry, isPending: false, error: null }),
  useDeleteProgressEntry: () => ({ mutate: deleteEntry, isPending: false, error: null }),
}))

const entry: ProgressEntryWithAuthor = {
  id: 'entry-1',
  student_id: 'student-1',
  recorded_on: '2026-09-30',
  weight_kg: 67.9,
  measurements: { waist_cm: 73 },
  note: null,
  recorded_by: 'trainer-1',
  created_at: '2026-09-30T10:00:00Z',
  updated_at: null,
  updated_by: null,
  author: { full_name: 'Paula Personal' },
}

describe('ProgressEntriesList', () => {
  beforeEach(() => {
    updateEntry.mockReset()
    deleteEntry.mockReset()
  })

  it('lista o registro com data, peso, medidas e autor', () => {
    render(<ProgressEntriesList entries={[entry]} studentId="student-1" />)

    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('30/09/2026')
    expect(item).toHaveTextContent('67,9 kg')
    expect(item).toHaveTextContent('Cintura 73 cm')
    expect(item).toHaveTextContent('Registrado por Paula Personal')
  })

  it('mostra estado vazio sem registros', () => {
    render(<ProgressEntriesList entries={[]} studentId="student-1" />)

    expect(screen.getByText('Nenhum registro ainda.')).toBeInTheDocument()
  })

  it('exclui o registro só depois de confirmar', async () => {
    render(<ProgressEntriesList entries={[entry]} studentId="student-1" />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir registro de 30/09/2026' }),
    )
    expect(deleteEntry).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(deleteEntry).toHaveBeenCalledWith('entry-1', expect.anything())
  })

  it('edita o registro a partir do formulário preenchido', async () => {
    render(<ProgressEntriesList entries={[entry]} studentId="student-1" />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Editar registro de 30/09/2026' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Editar registro' })
    const weight = within(dialog).getByLabelText('Peso (kg)')
    expect(weight).toHaveValue('67,9')
    await userEvent.clear(weight)
    await userEvent.type(weight, '67,5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar registro' }))

    expect(updateEntry).toHaveBeenCalledWith(
      {
        entryId: 'entry-1',
        recordedOn: '2026-09-30',
        weightKg: 67.5,
        measurements: { waist_cm: 73 },
        note: '',
      },
      expect.anything(),
    )
  })
})
