import { Copy, Dumbbell, PencilLine, Play, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { RoutineCard } from '@/features/workouts/RoutineCard'
import {
  useArchiveRoutine,
  useDuplicateRoutine,
  useTrainerRoutines,
} from '@/features/workouts/routine-queries'
import { useOpenWorkout, useStartWorkout } from '@/features/workouts/workout-queries'

/** Fichas de um aluno, vistas pelo personal no perfil (criar, editar, duplicar, arquivar). */
export function StudentRoutinesSection({
  trainerId,
  studentId,
}: {
  trainerId: string
  studentId: string
}) {
  const routines = useTrainerRoutines(trainerId, studentId)
  const archive = useArchiveRoutine()
  const duplicate = useDuplicateRoutine()
  const open = useOpenWorkout(studentId)
  const start = useStartWorkout()
  const navigate = useNavigate()

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Fichas</h2>
        <Button asChild className="h-10 px-3 text-xs">
          <Link to={`/app/fichas/nova?aluno=${studentId}`}>
            <Plus size={15} /> Nova ficha
          </Link>
        </Button>
      </div>
      {open.data && (
        <Link
          className="mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] bg-[var(--brand)] p-4 text-white transition hover:bg-[var(--brand-hover)]"
          to={`/app/treinos/sessao/${open.data.id}`}
        >
          <span className="text-sm font-semibold">
            Treino em andamento: {open.data.name}
          </span>
          <Play size={18} />
        </Link>
      )}
      {routines.isLoading && (
        <p className="rounded-2xl border border-white/8 bg-white/5 p-6 text-center text-sm text-slate-300">
          Carregando fichas…
        </p>
      )}
      {routines.error && (
        <p className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-100" role="alert">
          Não foi possível carregar as fichas.
        </p>
      )}
      {routines.data && routines.data.length === 0 && (
        <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
          <Dumbbell className="mx-auto text-blue-400" size={28} />
          <p className="mt-3 font-semibold">Nenhuma ficha ainda.</p>
          <p className="mt-1 text-sm text-slate-400">
            Monte a primeira ficha com exercícios, séries e descanso.
          </p>
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {routines.data?.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            trainerId={trainerId}
            actions={
              <>
                <Button
                  className="h-9 px-3 text-xs"
                  disabled={start.isPending || Boolean(open.data)}
                  onClick={() =>
                    start.mutate(
                      { routineId: routine.id, studentId },
                      {
                        onSuccess: (workoutId) =>
                          void navigate(`/app/treinos/sessao/${workoutId}`),
                      },
                    )
                  }
                >
                  <Play size={14} /> Iniciar
                </Button>
                <Button asChild className="h-9 px-3 text-xs" variant="outline">
                  <Link to={`/app/fichas/${routine.id}`}>
                    <PencilLine size={14} /> Editar
                  </Link>
                </Button>
                <Button
                  className="h-9 px-3 text-xs"
                  disabled={duplicate.isPending}
                  onClick={() => duplicate.mutate({ routineId: routine.id, studentId })}
                  variant="outline"
                >
                  <Copy size={14} /> Duplicar
                </Button>
                <Button
                  className="h-9 px-3 text-xs text-red-700 hover:bg-red-50"
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
    </section>
  )
}
