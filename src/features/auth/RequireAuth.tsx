import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'

export function RequireAuth() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f4f1e9] text-[#183529]">
        <p className="text-sm font-semibold">Preparando seu espaço…</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
