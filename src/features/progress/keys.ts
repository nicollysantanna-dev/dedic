export const progressKeys = {
  all: ['progress'] as const,
  entries: (studentId: string) => ['progress', 'entries', studentId] as const,
  goals: (studentId: string) => ['progress', 'goals', studentId] as const,
  photos: (studentId: string) => ['progress', 'photos', studentId] as const,
  photoUrl: (path: string) => ['progress', 'photo-url', path] as const,
}
