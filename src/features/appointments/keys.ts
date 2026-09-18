/**
 * Chaves do TanStack Query para tudo que deriva de aulas. Todas começam com
 * 'appointments' para que uma mutação invalide agenda, homes e resumos de uma vez.
 */
export const appointmentKeys = {
  all: ['appointments'] as const,
  range: (userId: string, start: Date, end: Date) =>
    ['appointments', 'range', userId, start.toISOString(), end.toISOString()] as const,
  slots: (trainerId: string, start: string, end: string) =>
    ['appointments', 'slots', trainerId, start, end] as const,
  allSlots: ['appointments', 'slots'] as const,
  blocks: (trainerId: string, start: Date, end: Date) =>
    [
      'appointments',
      'blocks',
      trainerId,
      start.toISOString(),
      end.toISOString(),
    ] as const,
  allBlocks: ['appointments', 'blocks'] as const,
  trainerToday: (trainerId: string, dayStart: string) =>
    ['appointments', 'trainer-today', trainerId, dayStart] as const,
  studentHistory: (studentId: string) =>
    ['appointments', 'student-history', studentId] as const,
  studentOverviews: (trainerId: string) =>
    ['appointments', 'student-overviews', trainerId] as const,
  studentProfile: (trainerId: string, studentId: string) =>
    ['appointments', 'student-profile', trainerId, studentId] as const,
}
