import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, Clock3, Phone, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase/client'

export function StudentTrainerPage() {
  const { profile } = useAuth()
  const studentId = profile?.id ?? ''
  const relationship = useQuery({
    queryKey: ['student-trainer-page', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('trainer_student_relationships')
        .select(
          'started_at, profiles!trainer_student_relationships_trainer_id_fkey(full_name, phone, default_lesson_duration_minutes)',
        )
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-slate-400">Seu acompanhamento profissional</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Meu personal
          </h1>
        </header>

        {relationship.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando vínculo…
          </p>
        )}
        {relationship.error && (
          <p className="mt-6 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível carregar o vínculo.
          </p>
        )}
        {!relationship.isLoading && !relationship.error && !relationship.data && (
          <section className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center">
            <UserRound className="mx-auto text-blue-400" size={32} />
            <h2 className="mt-4 text-xl font-bold">Nenhum personal vinculado.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Seu vínculo será criado automaticamente ao entrar com o contato informado no
              convite.
            </p>
          </section>
        )}

        {relationship.data && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
            <div className="rounded-[1.5rem] bg-white p-6 text-slate-950 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid size-20 place-items-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                  {initials(relationship.data.profiles?.full_name ?? 'Personal')}
                </span>
                <div>
                  <p className="text-xs text-slate-500">Personal trainer</p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {relationship.data.profiles?.full_name ?? 'Personal vinculado'}
                  </h2>
                  {relationship.data.started_at && (
                    <p className="mt-1 text-sm text-slate-500">
                      Acompanhamento desde {formatDate(relationship.data.started_at)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <Phone className="text-blue-600" size={18} />
                  <p className="mt-3 text-xs text-slate-500">Contato</p>
                  <p className="mt-1 font-semibold">
                    {relationship.data.profiles?.phone ?? 'Não informado'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <Clock3 className="text-blue-600" size={18} />
                  <p className="mt-3 text-xs text-slate-500">Duração da aula</p>
                  <p className="mt-1 font-semibold">
                    {relationship.data.profiles?.default_lesson_duration_minutes ?? 60}{' '}
                    minutos
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <CalendarDays className="text-blue-400" size={22} />
              <h2 className="mt-4 text-lg font-bold">Organize sua próxima aula</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Escolha um horário disponível ou consulte seus próximos compromissos.
              </p>
              <div className="mt-5 space-y-2">
                <Button asChild className="w-full">
                  <Link to="/app/agenda">
                    Agendar aula <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full border-[var(--brand)] bg-transparent text-[var(--brand)] hover:bg-[var(--brand)]/10"
                  variant="outline"
                >
                  <Link to="/app/agenda">Ver minha agenda</Link>
                </Button>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}
