import { describe, expect, it } from 'vitest'

import {
  currentTrainerPackages,
  packageDisplayStatus,
} from '@/features/credits/package-status'

const packages = [
  { id: 'atual', status: 'active' as const, trainer_id: 'personal-atual' },
  { id: 'antigo', status: 'active' as const, trainer_id: 'personal-antigo' },
  { id: 'cancelado', status: 'cancelled' as const, trainer_id: 'personal-atual' },
]

describe('currentTrainerPackages', () => {
  it('só conta pacotes ativos do personal com vínculo ativo', () => {
    expect(
      currentTrainerPackages(packages, 'personal-atual').map((item) => item.id),
    ).toEqual(['atual'])
  })

  it('sem vínculo ativo, nenhum pacote é utilizável', () => {
    expect(currentTrainerPackages(packages, null)).toEqual([])
  })
})

describe('packageDisplayStatus', () => {
  it('pacote ativo de outro personal aparece como vínculo encerrado', () => {
    expect(packageDisplayStatus(packages[1], 'personal-atual')).toBe('Vínculo encerrado')
  })

  it('demais pacotes mantêm o próprio status', () => {
    expect(packageDisplayStatus(packages[0], 'personal-atual')).toBe('Ativo')
    expect(packageDisplayStatus(packages[2], 'personal-atual')).toBe('Cancelado')
  })
})
