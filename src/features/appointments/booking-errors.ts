export function getBookingError(error: Error) {
  if (error.message.includes('ACTIVE_PACKAGE_REQUIRED')) {
    return 'Você precisa de um pacote ativo para agendar.'
  }
  if (error.message.includes('INSUFFICIENT_CREDITS')) {
    return 'Seu pacote não possui créditos disponíveis.'
  }
  if (error.message.includes('PACKAGE_INVALID_FOR_NEW_DATE')) {
    return 'O pacote não é válido para a nova data escolhida.'
  }
  if (
    error.message.includes('SLOT_UNAVAILABLE') ||
    error.message.includes('SLOT_CONFLICT')
  ) {
    return 'Este horário acabou de ficar indisponível. Escolha outro.'
  }
  return 'Não foi possível agendar a aula. Tente novamente.'
}
