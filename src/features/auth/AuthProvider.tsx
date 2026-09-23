import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { Profile } from '@/features/auth/types'
import { AuthContext, type AuthState } from '@/features/auth/auth-context'
import {
  captureInvitationToken,
  invitationStorageKey,
} from '@/features/auth/invitation-session'
import { supabase } from '@/lib/supabase/client'

async function loadProfile(userId: string) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, default_lesson_duration_minutes, avatar_path')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

async function loadProfileSafely(userId: string) {
  try {
    return { profile: await loadProfile(userId), failed: false }
  } catch {
    return { profile: null, failed: true }
  }
}

async function claimPendingInvitation() {
  if (!supabase) return 'idle' as const
  const token = window.localStorage.getItem(invitationStorageKey)
  const { data, error } = await supabase.rpc('claim_student_invitation', {
    invitation_token: token || undefined,
  })
  if (error) return 'error' as const
  if (!data) {
    if (token) window.localStorage.removeItem(invitationStorageKey)
    return token ? ('error' as const) : ('idle' as const)
  }

  if (token) window.localStorage.removeItem(invitationStorageKey)
  return 'success' as const
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [profileError, setProfileError] = useState(false)
  const [invitationClaimStatus, setInvitationClaimStatus] =
    useState<AuthState['invitationClaimStatus']>('idle')

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    const result = await loadProfileSafely(session.user.id)
    setProfile(result.profile)
    setProfileError(result.failed)
  }, [session])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  useEffect(() => {
    if (!supabase) return

    captureInvitationToken(window.location.search, window.localStorage)

    let active = true
    let pendingClaim: ReturnType<typeof claimPendingInvitation> | null = null

    const applyProfile = async (userId: string | undefined) => {
      if (!userId) {
        setProfile(null)
        setProfileError(false)
        return null
      }
      const result = await loadProfileSafely(userId)
      if (!active) return null
      setProfile(result.profile)
      setProfileError(result.failed)
      return result.profile
    }

    const claimInvitation = async () => {
      setInvitationClaimStatus('claiming')
      pendingClaim ??= claimPendingInvitation()
      const result = await pendingClaim
      pendingClaim = null
      if (active && result !== 'idle') setInvitationClaimStatus(result)
      return result
    }

    // Só alunos reivindicam convites; o claim pode preencher o telefone do perfil.
    const syncSession = async (userId: string | undefined) => {
      const loaded = await applyProfile(userId)
      if (!loaded) {
        setInvitationClaimStatus('idle')
        return
      }
      if (loaded.role !== 'student') return
      const result = await claimInvitation()
      if (result === 'success') await applyProfile(userId)
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return

      setSession(data.session)
      await syncSession(data.session?.user.id)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      window.setTimeout(() => {
        void (async () => {
          await syncSession(nextSession?.user.id)
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
      profileError,
      isLoading,
      invitationClaimStatus,
      refreshProfile,
      signOut,
    }),
    [
      session,
      profile,
      profileError,
      isLoading,
      invitationClaimStatus,
      refreshProfile,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
