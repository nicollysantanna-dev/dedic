export type AppRole = 'student' | 'trainer'

export type Profile = {
  id: string
  full_name: string
  phone: string | null
  role: AppRole
  default_lesson_duration_minutes: number | null
}
