import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useUpdateGoalStatus } from '@/features/progress/queries'

const select = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  requireSupabase: () => ({
    from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ select }) }) }) }),
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('useUpdateGoalStatus', () => {
  it('acusa erro quando a permissão não deixa alterar nenhuma meta', async () => {
    select.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useUpdateGoalStatus('student-1'), { wrapper })

    result.current.mutate({ goalId: 'goal-1', status: 'achieved' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('GOAL_NOT_UPDATED')
  })
})
