import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

import type { Profile } from '@/features/auth/types'

export type AuthState = {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
