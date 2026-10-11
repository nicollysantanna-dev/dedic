import { Share2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  deliverCard,
  renderCardBlob,
  shareButtonLabel,
} from '@/features/gamification/share-image'
import { formatDuration, formatKg } from '@/features/workouts/workout-math'
import {
  hasWorkoutAchievement,
  workoutAchievementsLine,
  workoutShareTitle,
} from '@/features/workouts/workout-share'
import { useWorkoutSummary } from '@/features/workouts/workout-summary'
import { WorkoutShareCard } from '@/features/workouts/WorkoutShareCard'

/**
 * Compartilhar o treino no resumo pós-treino. O botão aparece sempre para o aluno;
 * com conquista (medalha nova, semana batida ou recorde), o card abre sozinho.
 * O personal que registra o treino não vê nada daqui.
 */
export function WorkoutShare({
  workoutId,
  isStudent,
  studentName,
}: {
  workoutId: string
  isStudent: boolean
  studentName: string
}) {
  const summary = useWorkoutSummary(isStudent ? workoutId : null)
  // Aberto a pedido do aluno, ou sozinho quando há conquista e ele ainda não dispensou.
  const [requested, setRequested] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const close = () => {
    setRequested(false)
    setDismissed(true)
  }

  if (!isStudent) return null
  if (summary.isError) {
    return (
      <p className="mt-4 text-sm text-slate-400">
        Não foi possível preparar o card deste treino.
      </p>
    )
  }

  const data = summary.data
  const open = requested || (!dismissed && Boolean(data && hasWorkoutAchievement(data)))
  const share = async () => {
    if (!cardRef.current || !data) return
    setSharing(true)
    setShareError('')
    try {
      const blob = await renderCardBlob(cardRef.current)
      const result = await deliverCard(
        blob,
        `dedic-treino-${data.finished_at.slice(0, 10)}.png`,
      )
      if (result !== 'cancelled') close()
    } catch {
      setShareError('Não foi possível gerar a imagem. Tente novamente.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <Button
        className="mt-4 w-full"
        disabled={!data}
        onClick={() => setRequested(true)}
        variant="outline"
      >
        <Share2 size={16} /> Compartilhar
      </Button>

      {open && data && (
        <Dialog
          eyebrow="Treino finalizado"
          onClose={close}
          pending={sharing}
          title={workoutShareTitle(data)}
        >
          {workoutAchievementsLine(data) && (
            <p className="mt-2 text-sm font-semibold text-amber-600">
              {workoutAchievementsLine(data)}
            </p>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Duração</dt>
              <dd className="mt-1 font-bold">{formatDuration(data.duration_seconds)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Volume</dt>
              <dd className="mt-1 font-bold">{formatKg(data.volume_kg)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Séries</dt>
              <dd className="mt-1 font-bold">{data.sets}</dd>
            </div>
          </dl>
          {shareError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {shareError}
            </p>
          )}
          <div className="mt-5 grid gap-2">
            <Button disabled={sharing} onClick={() => void share()}>
              {sharing ? 'Gerando imagem…' : shareButtonLabel()}
            </Button>
            <Button disabled={sharing} onClick={close} variant="outline">
              Agora não
            </Button>
          </div>
        </Dialog>
      )}

      {data && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-[-10000px]"
        >
          <WorkoutShareCard cardRef={cardRef} studentName={studentName} summary={data} />
        </div>
      )}
    </>
  )
}
