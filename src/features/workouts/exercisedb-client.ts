/**
 * Adaptador do ExerciseDB gratuito (https://oss.exercisedb.dev). Sem chave.
 * Só é chamado ao abrir um exercício: GIF e instruções não são persistidos,
 * pois as URLs de mídia rodam toda segunda-feira (política do provedor).
 */
const baseUrl = 'https://oss.exercisedb.dev/api/v1'
const timeoutMs = 8000

export type ExerciseDetail = {
  externalId: string
  name: string
  gifUrl: string
  instructions: string[]
}

type ApiExercise = {
  exerciseId: string
  name: string
  gifUrl: string
  instructions?: string[]
}

export class ExerciseDbError extends Error {
  constructor(
    public readonly status: number,
    message = `ExerciseDB respondeu ${status}`,
  ) {
    super(message)
  }
}

export async function getExerciseDetail(externalId: string): Promise<ExerciseDetail> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(
      `${baseUrl}/exercises/${encodeURIComponent(externalId)}`,
      {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      },
    )
    if (!response.ok) throw new ExerciseDbError(response.status)
    const payload = (await response.json()) as { data: ApiExercise }
    return {
      externalId: payload.data.exerciseId,
      name: payload.data.name,
      gifUrl: payload.data.gifUrl,
      // As instruções vêm prefixadas com "Step:N" na API.
      instructions: (payload.data.instructions ?? []).map((step) =>
        step.replace(/^Step:\s*\d+\s*/i, '').trim(),
      ),
    }
  } finally {
    window.clearTimeout(timer)
  }
}
