export const workoutKeys = {
  all: ['workouts'] as const,
  exerciseSearch: (term: string, bodyPart: string | null, equipment: string | null) =>
    ['workouts', 'exercises', 'search', term, bodyPart ?? '', equipment ?? ''] as const,
  aliases: (trainerId: string) => ['workouts', 'aliases', trainerId] as const,
}

export const routineKeys = {
  all: ['routines'] as const,
  forStudent: (studentId: string) => ['routines', 'student', studentId] as const,
  mine: (trainerId: string) => ['routines', 'trainer', trainerId] as const,
  detail: (routineId: string) => ['routines', 'detail', routineId] as const,
}
