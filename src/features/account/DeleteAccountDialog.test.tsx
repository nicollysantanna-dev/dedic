import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteAccountDialog } from './DeleteAccountDialog'

const mutateAsync = vi.fn()
const mutation = { mutateAsync, isPending: false, isError: false }
const impact: { data: { futureLessons: number; activeStudents: number } | undefined } = {
  data: undefined,
}
const navigate = vi.fn()
const signOut = vi.fn().mockResolvedValue(undefined)

vi.mock('./delete-account-queries', () => ({
  useDeleteAccount: () => mutation,
  useDeletionImpact: () => impact,
}))
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    session: { access_token: 'token-123' },
    profile: { id: 'p-1', role: 'trainer' },
    signOut,
  }),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    navigate.mockReset()
    signOut.mockClear()
    mutation.isError = false
    impact.data = undefined
  })

  it('botão Excluir conta só habilita com EXCLUIR', async () => {
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Excluir conta' })
    expect(button).toBeDisabled()
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'excluir',
    )
    expect(button).toBeDisabled()
    await userEvent.clear(screen.getByLabelText('Digite EXCLUIR para confirmar'))
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    expect(button).toBeEnabled()
  })

  it('personal vê o impacto', () => {
    impact.data = { futureLessons: 3, activeStudents: 2 }
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByText('3 aulas futuras serão canceladas')).toBeInTheDocument()
    expect(screen.getByText('2 alunos serão desvinculados')).toBeInTheDocument()
  })

  it('exclui, sai da sessão e navega para o login', async () => {
    mutateAsync.mockResolvedValue(undefined)
    signOut.mockRejectedValueOnce(new Error('session revoked'))
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }))
    expect(mutateAsync).toHaveBeenCalledWith('token-123')
    expect(navigate).toHaveBeenCalledWith('/?conta=excluida', { replace: true })
  })

  it('erro mostra tentar novamente', async () => {
    mutateAsync.mockRejectedValue(new Error('DELETE_FAILED'))
    mutation.isError = true
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível excluir sua conta.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(mutateAsync).toHaveBeenCalledWith('token-123')
    expect(navigate).not.toHaveBeenCalled()
  })
})
