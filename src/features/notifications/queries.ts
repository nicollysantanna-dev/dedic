import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { requireSupabase } from '@/lib/supabase/client'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => ['notifications', 'list', userId] as const,
}

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: notificationKeys.list(userId),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const { error } = await requireSupabase().rpc('mark_notifications_read', {
        target_ids: ids,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
