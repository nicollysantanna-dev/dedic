import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_LABEL } from '@/features/legal/legal'

/** Moldura de leitura das páginas públicas de termos e privacidade. */
export function LegalDocumentLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const goBack = () => {
    // Link direto (sem histórico na aplicação) volta para a entrada.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/')
  }

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] px-4 py-6 text-white sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar
        </button>
        <article className="mt-4 rounded-[1.75rem] bg-white p-6 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-10">
          <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{LEGAL_EFFECTIVE_LABEL}</p>
          <div className="mt-6 space-y-6 text-[15px] leading-7 text-slate-700 [overflow-wrap:anywhere]">
            {children}
          </div>
        </article>
      </div>
    </main>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

export function ContactLink() {
  return (
    <a
      className="font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4"
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  )
}
