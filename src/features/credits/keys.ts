export const creditKeys = {
  all: ['credits'] as const,
  balance: (studentId: string) => ['credits', 'balance', studentId] as const,
  ledger: (studentId: string) => ['credits', 'ledger', studentId] as const,
  packages: (studentId: string) => ['credits', 'packages', studentId] as const,
  activePackage: (studentId: string) => ['credits', 'active-package', studentId] as const,
}
