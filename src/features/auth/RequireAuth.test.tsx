import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RequireAuth } from '@/features/auth/RequireAuth'

const refreshProfile = vi.fn()
const signOut = vi.fn()
const authState = {
  session: { user: { id: 'user-1' } },
  profile: null as unknown,
  profileError: true,
  isLoading: false,
  invitationClaimStatus: 'idle',
  refreshProfile,
  signOut,
}

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => authState,
}))

describe('RequireAuth', () => {
  it('oferece nova tentativa e saída quando o perfil não carrega', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<p>Área protegida</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seu perfil',
    )
    expect(screen.queryByText('Área protegida')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(refreshProfile).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
