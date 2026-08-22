import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { Profile } from '@/features/auth/types'
import { AuthContext, type AuthState } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase/client'

async function loadProfile(userId: string) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, default_lesson_duration_minutes')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    setProfile(await loadProfile(session.user.id))
  }, [session])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return

      setSession(data.session)
      setProfile(data.session ? await loadProfile(data.session.user.id) : null)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      window.setTimeout(() => {
        void (async () => {
          setProfile(nextSession ? await loadProfile(nextSession.user.id) : null)
          setIsLoading(false)
        })()
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      isLoading,
      refreshProfile,
      signOut,
    }),
    [session, profile, isLoading, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
