import { useAuth } from '@/features/auth/auth-context'
import { ProgressSection } from '@/features/progress/ProgressSection'

export function StudentProgressPage() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm text-slate-400">Peso, medidas, fotos e metas</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Minha evolução
          </h1>
        </header>
        <div className="mt-6">
          <ProgressSection
            studentId={profile.id}
            viewerId={profile.id}
            viewerRole="student"
          />
        </div>
      </div>
    </main>
  )
}
