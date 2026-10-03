import { useSyncExternalStore } from 'react'

type InstallOutcome = 'accepted' | 'dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallOutcome }>
}

type InstallPromptState = { event: BeforeInstallPromptEvent | null; installed: boolean }

let state: InstallPromptState = { event: null, installed: false }
let listening = false
const subscribers = new Set<() => void>()

function update(next: Partial<InstallPromptState>) {
  state = { ...state, ...next }
  subscribers.forEach((notify) => notify())
}

/**
 * Escuta o convite de instalação do navegador (Chrome/Edge no Android e no computador).
 * Chamado cedo em `main.tsx`, porque o evento pode disparar antes da tela inicial montar.
 */
export function listenForInstallPrompt() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    update({ event: event as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => update({ event: null, installed: true }))
}

export function useInstallPrompt() {
  listenForInstallPrompt()
  const current = useSyncExternalStore(
    (notify) => {
      subscribers.add(notify)
      return () => subscribers.delete(notify)
    },
    () => state,
  )

  /** Abre o convite do navegador; o evento só pode ser usado uma vez. */
  const promptInstall = async (): Promise<InstallOutcome | null> => {
    if (!current.event) return null
    await current.event.prompt()
    const choice = await current.event.userChoice
    update({ event: null })
    return choice.outcome
  }

  return {
    canPrompt: current.event !== null,
    installed: current.installed,
    promptInstall,
  }
}
