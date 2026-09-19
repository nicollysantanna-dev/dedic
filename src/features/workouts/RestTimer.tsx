import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatClock } from '@/features/workouts/workout-math'

/**
 * Temporizador de descanso (barra fixa acima da navegação), no estilo Hevy:
 * contagem regressiva, +30 s e pular. Vibra ao terminar quando suportado.
 */
export function RestTimer({
  endsAt,
  totalSeconds,
  onExtend,
  onSkip,
}: {
  endsAt: number
  totalSeconds: number
  onExtend: () => void
  onSkip: () => void
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  )

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [endsAt])

  useEffect(() => {
    if (remaining > 0) return
    if ('vibrate' in navigator) navigator.vibrate?.(200)
    const timeout = window.setTimeout(onSkip, 1500)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0])

  const progress =
    totalSeconds > 0 ? Math.min(100, (1 - remaining / totalSeconds) * 100) : 100

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md overflow-hidden rounded-2xl bg-[var(--brand)] text-white shadow-2xl lg:bottom-6"
      role="timer"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-blue-100">
            {remaining === 0 ? 'Descanso concluído' : 'Descanso'}
          </p>
          <p className="text-2xl font-bold tabular-nums">{formatClock(remaining)}</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"
          onClick={onExtend}
          type="button"
        >
          <Plus size={15} /> 30 s
        </button>
        <button
          aria-label="Pular descanso"
          className="grid size-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25"
          onClick={onSkip}
          type="button"
        >
          <X size={17} />
        </button>
      </div>
      <div className="h-1 bg-white/20">
        <div
          className="h-full bg-white transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
