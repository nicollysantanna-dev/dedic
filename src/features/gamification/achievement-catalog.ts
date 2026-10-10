// Nomes e regras das medalhas (ADR 0013). O código é o mesmo gravado no banco.
// Os ícones em pixel art entram depois; por enquanto a lista usa só texto.
const achievementCatalog: Record<string, { name: string; description: string }> = {
  first_check_in: { name: 'Primeiro passo', description: 'Primeiro check-in' },
  streak_4: { name: 'Sequência 4', description: '4 semanas batidas seguidas' },
  streak_8: { name: 'Sequência 8', description: '8 semanas batidas seguidas' },
  streak_12: { name: 'Sequência 12', description: '12 semanas batidas seguidas' },
  check_ins_10: { name: '10 check-ins', description: '10 dias de treino ou aula' },
  check_ins_50: { name: '50 check-ins', description: '50 dias de treino ou aula' },
  check_ins_100: { name: '100 check-ins', description: '100 dias de treino ou aula' },
  lessons_10: { name: '10 aulas', description: '10 aulas concluídas' },
  lessons_50: { name: '50 aulas', description: '50 aulas concluídas' },
  lessons_100: { name: '100 aulas', description: '100 aulas concluídas' },
  full_month: { name: 'Mês completo', description: 'Todas as semanas do mês batidas' },
  comeback: {
    name: 'Volta por cima',
    description: 'Semana batida logo depois de uma não batida',
  },
  early_bird: {
    name: 'Madrugador',
    description: '5 check-ins no mês com atividade antes das 7h',
  },
}

export function achievementName(code: string): string {
  return achievementCatalog[code]?.name ?? 'Medalha'
}

export function achievementDescription(code: string): string {
  return achievementCatalog[code]?.description ?? ''
}
