export const workoutKeys = {
  all: ['workouts'] as const,
  exerciseSearch: (term: string, bodyPart: string | null, equipment: string | null) =>
    ['workouts', 'exercises', 'search', term, bodyPart ?? '', equipment ?? ''] as const,
  exerciseDetail: (externalId: string) =>
    ['workouts', 'exercises', 'detail', externalId] as const,
  aliases: (trainerId: string) => ['workouts', 'aliases', trainerId] as const,
}
