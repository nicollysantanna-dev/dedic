/**
 * Mapeamento puro do payload bruto da API do Hevy para o formato normalizado
 * que `import_hevy_workout` espera. Mantém a parte sem estado (vocabulário de
 * tipo de série, formato de datas) testável em TypeScript; autorização,
 * idempotência e casamento de exercício ficam no banco (pgTAP).
 *
 * O formato de `HevyApiWorkout` segue a resposta documentada de
 * `GET /v1/workouts` da API do Hevy — confirmar contra a documentação/API real
 * antes de usar em produção, os nomes de campo aqui não foram verificados
 * contra uma conta Hevy real.
 */

export type DedicSetType = 'normal' | 'warmup' | 'failure'

export type HevyApiSet = {
  type?: string | null
  weight_kg?: number | null
  reps?: number | null
}

export type HevyApiExercise = {
  exercise_template_id: string
  title: string
  sets: HevyApiSet[]
}

export type HevyApiWorkout = {
  id: string
  title?: string | null
  start_time: string
  end_time: string
  exercises: HevyApiExercise[]
}

export type NormalizedHevySet = {
  type: DedicSetType
  weight_kg: number | null
  reps: number | null
}

export type NormalizedHevyExercise = {
  template_id: string
  title: string
  sets: NormalizedHevySet[]
}

export type NormalizedHevyWorkout = {
  name: string
  started_at: string
  finished_at: string
  exercises: NormalizedHevyExercise[]
}

/** Vocabulário do Hevy é mais rico que o do Dedic; tipo desconhecido cai em 'normal'. */
export function mapHevySetType(hevyType: string | null | undefined): DedicSetType {
  if (hevyType === 'warmup') return 'warmup'
  if (hevyType === 'failure') return 'failure'
  return 'normal'
}

/** Converte um treino bruto do Hevy para o payload aceito por import_hevy_workout. */
export function normalizeHevyWorkout(raw: HevyApiWorkout): NormalizedHevyWorkout {
  return {
    name: raw.title?.trim() || 'Treino importado',
    started_at: raw.start_time,
    finished_at: raw.end_time,
    exercises: raw.exercises.map((exercise) => ({
      template_id: exercise.exercise_template_id,
      title: exercise.title,
      sets: exercise.sets.map((set) => ({
        type: mapHevySetType(set.type),
        weight_kg: set.weight_kg ?? null,
        reps: set.reps ?? null,
      })),
    })),
  }
}
