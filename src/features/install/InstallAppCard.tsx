import { Smartphone, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { currentInstallPlatform } from '@/features/install/install-platform'
import { useInstallPrompt } from '@/features/install/install-prompt'
import { cn } from '@/lib/utils'

const dismissedKey = 'dedic:install-card-dismissed'

function readDismissed() {
  try {
    return window.localStorage.getItem(dismissedKey) === '1'
  } catch {
    return false
  }
}

function saveDismissed() {
  try {
    window.localStorage.setItem(dismissedKey, '1')
  } catch {
    // Sem armazenamento (aba anônima): o card só some nesta visita.
  }
}

const manualSteps = {
  ios: 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.',
  android: 'No Chrome, toque em ⋮ e depois em Instalar app.',
} as const

/** Convida a instalar o PWA, com o passo a passo da plataforma em que o app está aberto. */
export function InstallAppCard({ className }: { className?: string }) {
  const [platform] = useState(currentInstallPlatform)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [accepted, setAccepted] = useState(false)
  const { canPrompt, installed, promptInstall } = useInstallPrompt()

  const steps =
    platform === 'ios' || platform === 'android' ? manualSteps[platform] : null
  if (
    dismissed ||
    accepted ||
    installed ||
    platform === 'installed' ||
    (!canPrompt && !steps)
  ) {
    return null
  }

  const dismiss = () => {
    saveDismissed()
    setDismissed(true)
  }

  return (
    <section
      aria-labelledby="install-app-title"
      className={cn(
        'flex gap-3 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-slate-200',
        className,
      )}
    >
      <Smartphone
        className="mt-0.5 shrink-0 text-blue-300"
        size={20}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2 id="install-app-title" className="font-bold text-white">
          Instale o Dedic no seu celular
        </h2>
        <p className="mt-1 text-slate-300">
          Na tela inicial, o Dedic abre como um aplicativo, em tela cheia.
        </p>
        {canPrompt ? (
          <Button
            className="mt-3"
            onClick={() =>
              void promptInstall().then((outcome) => setAccepted(outcome === 'accepted'))
            }
          >
            Instalar o Dedic
          </Button>
        ) : (
          <p className="mt-2 font-semibold text-white">{steps}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <X size={14} aria-hidden="true" />
        Agora não
      </button>
    </section>
  )
}
