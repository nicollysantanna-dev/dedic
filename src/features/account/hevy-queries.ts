import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { workoutSessionKeys } from '@/features/workouts/workout-queries'
import { requireSupabase } from '@/lib/supabase/client'

export const hevyKeys = {
  connection: (userId: string) => ['hevy', 'connection', userId] as const,
}

export function useHevyConnection(userId: string) {
  return useQuery({
    queryKey: hevyKeys.connection(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('hevy_connections')
        .select('connected_at, last_synced_at, last_sync_status, last_sync_error')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useConnectHevy(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (apiKey: string) => {
      const { error } = await requireSupabase().rpc('connect_hevy_account', {
        requested_api_key: apiKey,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hevyKeys.connection(userId) })
    },
  })
}

export function useDisconnectHevy(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().rpc('disconnect_hevy_account')
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hevyKeys.connection(userId) })
    },
  })
}

type HevySyncPageResult = {
  imported: number
  skipped: number
  errors: string[]
  hasMore: boolean
  nextPage: number | null
}

export type HevySyncResult = { imported: number; skipped: number; errors: string[] }

/**
 * Sincroniza o histórico completo, paginando do treino mais antigo para o
 * mais novo — a primeira chamada (sem `page`) deixa o servidor descobrir o
 * total de páginas do Hevy e já começar pela mais antiga; as seguintes usam o
 * `nextPage` devolvido, até não haver mais páginas.
 */
export function useSyncHevy(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accessToken: string) => {
      const totals: HevySyncResult = { imported: 0, skipped: 0, errors: [] }
      let page: number | null = null
      let hasMore = true

      while (hasMore) {
        const response = await fetch('/api/hevy-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(page === null ? {} : { page }),
        })
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)
          const errorCode =
            body && typeof body === 'object' && 'error' in body
              ? String(body.error)
              : 'SYNC_FAILED'
          throw new Error(errorCode)
        }

        const body = (await response.json()) as HevySyncPageResult
        totals.imported += body.imported
        totals.skipped += body.skipped
        totals.errors.push(...body.errors)
        hasMore = body.hasMore
        page = body.nextPage
      }

      return totals
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hevyKeys.connection(userId) })
      void queryClient.invalidateQueries({ queryKey: workoutSessionKeys.all })
    },
  })
}
