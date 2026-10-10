/** Chaves do TanStack Query da constância e do relatório mensal. */
export const gamificationKeys = {
  all: ['gamification'] as const,
  report: (studentId: string, month: string) =>
    ['gamification', 'report', studentId, month] as const,
  firstCheckInDay: (studentId: string) =>
    ['gamification', 'first-check-in-day', studentId] as const,
}
