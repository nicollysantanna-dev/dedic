import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

export function RequireAuth() {
  const { session, profile, profileError, isLoading, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--app-bg)] text-slate-300">
        <p className="text-sm font-semibold">Preparando seu espaço…</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (profileError || !profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--app-bg)] px-5 text-white">
        <section
          className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-slate-950"
          role="alert"
        >
          <h1 className="text-xl font-bold">Não foi possível carregar seu perfil</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Verifique sua conexão e tente novamente. Se o problema continuar, saia e entre
            de novo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void refreshProfile()}>Tentar novamente</Button>
            <Button onClick={() => void signOut()} variant="outline">
              Sair da conta
            </Button>
          </div>
        </section>
      </main>
    )
  }

  return <Outlet />
}
