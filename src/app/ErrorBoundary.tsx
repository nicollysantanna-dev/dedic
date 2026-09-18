import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

type State = { failed: boolean }

/** Evita tela em branco quando uma página quebra: mostra um aviso e permite recarregar. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sem dados pessoais: apenas a mensagem e a pilha de componentes.
    console.error('Falha ao renderizar a página', error.message, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--app-bg)] px-5 text-white">
        <section
          className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-slate-950"
          role="alert"
        >
          <h1 className="text-xl font-bold">Algo deu errado nesta tela</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Recarregue a página. Se o problema continuar, saia e entre novamente.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </section>
      </main>
    )
  }
}
