import { Copy, Dumbbell, PencilLine, Play, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { RoutineCard } from '@/features/workouts/RoutineCard'
import {
  useArchiveRoutine,
  useDuplicateRoutine,
  useStudentRoutines,
} from '@/features/workouts/routine-queries'
import { useOpenWorkout, useStartWorkout } from '@/features/workouts/workout-queries'
import { formatDateTime } from '@/lib/format'

/** Aba Treinos do aluno: sessão em andamento, fichas para iniciar e treino livre. */
export function StudentWorkoutsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const studentId = profile?.id ?? ''
  const routines = useStudentRoutines(studentId)
  const open = useOpenWorkout(studentId)
  const start = useStartWorkout()
  const archive = useArchiveRoutine()
  const duplicate = useDuplicateRoutine()

  const begin = (input: { routineId?: string; name?: string }) =>
    start.mutate(input, {
      onSuccess: (workoutId) => void navigate(`/app/treinos/sessao/${workoutId}`),
    })

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Suas fichas e sessões</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Treinos
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {!open.data && (
              <Button
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                disabled={start.isPending}
                onClick={() => begin({ name: 'Treino livre' })}
                variant="outline"
              >
                <Play size={17} /> Treino livre
              </Button>
            )}
            <Button asChild>
              <Link to="/app/fichas/nova">
                <Plus size={17} /> Nova ficha
              </Link>
            </Button>
          </div>
        </header>

        {open.data && (
          <Link
            className="mt-6 flex items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--brand)] p-5 text-white shadow-lg transition hover:bg-[var(--brand-hover)]"
            to={`/app/treinos/sessao/${open.data.id}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Treino em andamento
              </p>
              <p className="mt-1 text-lg font-bold">{open.data.name}</p>
              <p className="text-xs text-blue-100">
                Iniciado em {formatDateTime(open.data.started_at)}
              </p>
            </div>
            <Play size={24} />
          </Link>
        )}

        {start.error && (
          <p
            className="mt-4 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível iniciar o treino. Finalize ou descarte a sessão em andamento.
          </p>
        )}

        <h2 className="mt-8 text-lg font-bold">Fichas</h2>
        {routines.isLoading && (
          <p className="mt-3 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando fichas…
          </p>
        )}
        {routines.error && (
          <p
            className="mt-3 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar suas fichas.
          </p>
        )}
        {routines.data && routines.data.length === 0 && (
          <section className="mt-3 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center">
            <Dumbbell className="mx-auto text-blue-400" size={30} />
            <h3 className="mt-4 text-lg font-bold">Nenhuma ficha ainda.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Quando seu personal montar uma ficha para você, ela aparece aqui. Enquanto
              isso, registre um treino livre.
            </p>
          </section>
        )}
        <div className="mt-3 grid gap-3">
          {routines.data?.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              viewerId={studentId}
              trainerId={routine.trainer_id}
              actions={
                <>
                  <Button
                    className="h-10"
                    disabled={start.isPending || Boolean(open.data)}
                    onClick={() => begin({ routineId: routine.id })}
                  >
                    <Play size={16} /> Iniciar ficha
                  </Button>
                  <Button asChild className="h-10 px-3 text-xs" variant="outline">
                    <Link to={`/app/fichas/${routine.id}`}>
                      <PencilLine size={14} /> Editar
                    </Link>
                  </Button>
                  <Button
                    className="h-10 px-3 text-xs"
                    disabled={duplicate.isPending}
                    onClick={() =>
                      duplicate.mutate({ routineId: routine.id, studentId: null })
                    }
                    variant="outline"
                  >
                    <Copy size={14} /> Duplicar
                  </Button>
                  <Button
                    className="h-10 px-3 text-xs text-red-700 hover:bg-red-50"
                    disabled={archive.isPending}
                    onClick={() => {
                      if (window.confirm(`Arquivar a ficha "${routine.name}"?`)) {
                        archive.mutate(routine.id)
                      }
                    }}
                    variant="ghost"
                  >
                    <Trash2 size={14} /> Arquivar
                  </Button>
                </>
              }
            />
          ))}
        </div>
      </div>
    </main>
  )
}
