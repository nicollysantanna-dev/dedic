import { describe, expect, it, vi } from 'vitest'

import {
  authPathWithInvitation,
  captureInvitationToken,
  invitationStorageKey,
  readInvitationToken,
} from '@/features/auth/invitation-session'

const token = '8b3d6e56-91c4-4e8f-9ee4-a4d9b0f88961'

describe('sessão de convite', () => {
  it('salva o token assim que o link é aberto, mesmo antes do login', () => {
    const setItem = vi.fn()

    expect(captureInvitationToken(`?convite=${token}`, { setItem })).toBe(token)
    expect(setItem).toHaveBeenCalledWith(invitationStorageKey, token)
  })

  it('ignora tokens inválidos', () => {
    const setItem = vi.fn()

    expect(captureInvitationToken('?convite=invalido', { setItem })).toBeNull()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva o convite ao alternar entre cadastro e entrada', () => {
    expect(authPathWithInvitation('/', `?convite=${token}`)).toBe(`/?convite=${token}`)
    expect(authPathWithInvitation('/cadastro', `?convite=${token}`)).toBe(
      `/cadastro?convite=${token}`,
    )
    expect(readInvitationToken('?foo=bar')).toBeNull()
  })
})
