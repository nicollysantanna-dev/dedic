import { AgendaHomePage } from '@/features/appointments/AgendaHomePage'
import { useAuth } from '@/features/auth/auth-context'
import { TrainerHomePage } from '@/features/dashboard/TrainerHomePage'

export function HomePage() {
  const { profile } = useAuth()
  return profile?.role === 'trainer' ? <TrainerHomePage /> : <AgendaHomePage />
}
