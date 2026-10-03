import type { Tables } from '@/lib/supabase/database.types'

type PackageLike = Pick<Tables<'lesson_packages'>, 'status' | 'trainer_id'>

const packageStatusLabels: Record<Tables<'lesson_packages'>['status'], string> = {
  draft: 'Aguardando ativação',
  active: 'Ativo',
  exhausted: 'Esgotado',
  expired: 'Encerrado',
  cancelled: 'Cancelado',
}

/**
 * Pacotes que o aluno pode usar: ativos e do personal com vínculo ativo — a mesma
 * regra do saldo no banco (`get_credit_balance`).
 */
export function currentTrainerPackages<T extends PackageLike>(
  packages: readonly T[],
  activeTrainerId: string | null,
): T[] {
  if (!activeTrainerId) return []
  return packages.filter(
    (item) => item.status === 'active' && item.trainer_id === activeTrainerId,
  )
}

export function packageDisplayStatus(item: PackageLike, activeTrainerId: string | null) {
  if (item.status === 'active' && item.trainer_id !== activeTrainerId) {
    return 'Vínculo encerrado'
  }
  return packageStatusLabels[item.status]
}
