import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteAccountDialog } from './DeleteAccountDialog'

const mutateAsync = vi.fn()
const mutation = { mutateAsync, isPending: false, isError: false }
const refetch = vi.fn()
const impact: {
  data: { futureLessons: number; activeStudents: number } | undefined
  isError: boolean
  refetch: typeof refetch
} = { data: undefined, isError: false, refetch }
const auth = { role: 'trainer' }
const navigate = vi.fn()
const signOut = vi.fn().mockResolvedValue(undefined)

vi.mock('./delete-account-queries', () => ({
  useDeleteAccount: () => mutation,
  useDeletionImpact: () => impact,
}))
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    session: { access_token: 'token-123' },
    profile: { id: 'p-1', role: auth.role },
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
    impact.isError = false
    refetch.mockReset()
    auth.role = 'trainer'
  })

  it('botão Excluir conta só habilita com EXCLUIR', async () => {
    impact.data = { futureLessons: 0, activeStudents: 0 }
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
    impact.data = { futureLessons: 0, activeStudents: 0 }
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
    impact.data = { futureLessons: 0, activeStudents: 0 }
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

  it('personal com impacto carregando mantém confirmar desabilitado', async () => {
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Calculando o impacto…')
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    expect(screen.getByRole('button', { name: 'Excluir conta' })).toBeDisabled()
  })

  it('personal com erro no impacto permite refazer e mantém confirmar desabilitado', async () => {
    impact.isError = true
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível calcular o impacto da exclusão.',
    )
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    expect(screen.getByRole('button', { name: 'Excluir conta' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('aluno não depende do impacto', async () => {
    auth.role = 'student'
    render(<DeleteAccountDialog open onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await userEvent.type(
      screen.getByLabelText('Digite EXCLUIR para confirmar'),
      'EXCLUIR',
    )
    expect(screen.getByRole('button', { name: 'Excluir conta' })).toBeEnabled()
  })
})
