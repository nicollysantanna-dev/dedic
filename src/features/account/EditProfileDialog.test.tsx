import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EditProfileDialog } from './EditProfileDialog'

const rpc = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({ rpc }),
}))

describe('EditProfileDialog', () => {
  it('envia o perfil normalizado pelo RPC e avisa ao salvar', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EditProfileDialog
          profile={{
            id: 'trainer-1',
            full_name: 'Paula Personal',
            phone: null,
            role: 'trainer',
            default_lesson_duration_minutes: 60,
            avatar_path: null,
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    )

    await userEvent.clear(screen.getByLabelText('Nome completo'))
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Paula P. Silva')
    await userEvent.type(screen.getByLabelText('Celular'), '11988887777')
    await userEvent.selectOptions(screen.getByLabelText(/Duração padrão da aula/), '45')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(rpc).toHaveBeenCalledWith('update_own_profile', {
      requested_full_name: 'Paula P. Silva',
      requested_phone: '+5511988887777',
      requested_lesson_duration_minutes: 45,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('bloqueia nome curto antes de chamar o servidor', async () => {
    rpc.mockClear()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EditProfileDialog
          profile={{
            id: 'student-1',
            full_name: 'Ana Aluna',
            phone: '+5511999990002',
            role: 'student',
            default_lesson_duration_minutes: null,
            avatar_path: null,
          }}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(screen.queryByLabelText(/Duração padrão da aula/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Celular')).toHaveValue('(11) 99999-0002')

    await userEvent.clear(screen.getByLabelText('Nome completo'))
    await userEvent.type(screen.getByLabelText('Nome completo'), 'A')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu nome completo.',
    )
    expect(rpc).not.toHaveBeenCalled()
  })
})
