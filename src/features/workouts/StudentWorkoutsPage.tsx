import { Dumbbell } from 'lucide-react'

import { useAuth } from '@/features/auth/auth-context'
import { RoutineCard } from '@/features/workouts/RoutineCard'
import { useStudentRoutines } from '@/features/workouts/routine-queries'

/** Aba Treinos do aluno: fichas atribuídas pelo personal (sessões e histórico chegam no T3/T4). */
export function StudentWorkoutsPage() {
  const { profile } = useAuth()
  const studentId = profile?.id ?? ''
  const routines = useStudentRoutines(studentId)

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-sm text-slate-400">Suas fichas de treino</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Treinos
          </h1>
        </header>

        {routines.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando fichas…
          </p>
        )}
        {routines.error && (
          <p
            className="mt-6 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar suas fichas.
          </p>
        )}
        {routines.data && routines.data.length === 0 && (
          <section className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center">
            <Dumbbell className="mx-auto text-blue-400" size={30} />
            <h2 className="mt-4 text-lg font-bold">Nenhuma ficha ainda.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Quando seu personal montar uma ficha para você, ela aparece aqui.
            </p>
          </section>
        )}
        <div className="mt-6 grid gap-3">
          {routines.data?.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              trainerId={routine.trainer_id}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
