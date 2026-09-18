export const invitationStorageKey = 'dedic.pendingInvitationToken'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function readInvitationToken(search: string) {
  const token = new URLSearchParams(search).get('convite')
  return token && uuidPattern.test(token) ? token : null
}

export function captureInvitationToken(
  search: string,
  storage: Pick<Storage, 'setItem'>,
) {
  const token = readInvitationToken(search)
  if (token) storage.setItem(invitationStorageKey, token)
  return token
}

export function authPathWithInvitation(path: '/' | '/cadastro', search: string) {
  const token = readInvitationToken(search)
  return token ? `${path}?convite=${token}` : path
}
