export const paymentKeys = {
  all: ['payments'] as const,
  list: (column: 'trainer_id' | 'student_id', userId: string) =>
    ['payments', 'list', column, userId] as const,
  next: (studentId: string) => ['payments', 'next', studentId] as const,
  trainerSummary: (trainerId: string) =>
    ['payments', 'trainer-summary', trainerId] as const,
}
