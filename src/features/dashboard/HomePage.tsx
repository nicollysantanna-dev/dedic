import { useAuth } from '@/features/auth/auth-context'
import { StudentHomePage } from '@/features/dashboard/StudentHomePage'
import { TrainerHomePage } from '@/features/dashboard/TrainerHomePage'

export function HomePage() {
  const { profile } = useAuth()
  return profile?.role === 'trainer' ? <TrainerHomePage /> : <StudentHomePage />
}
