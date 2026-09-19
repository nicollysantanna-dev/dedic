import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * Diálogo padrão do app: bottom sheet no celular, centralizado no desktop.
 * Fecha com Escape ou clique fora (exceto enquanto `pending`), devolve o foco ao abrir/fechar.
 */
export function Dialog({
  title,
  eyebrow,
  onClose,
  pending,
  children,
}: {
  title: string
  eyebrow: string
  onClose: () => void
  pending: boolean
  children: React.ReactNode
}) {
  const titleId = `dialog-${title.replace(/\s+/g, '-').toLowerCase()}`
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    sectionRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 text-slate-950 shadow-2xl outline-none sm:max-w-lg sm:rounded-[1.75rem] sm:p-6"
        ref={sectionRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]" id={titleId}>
              {title}
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
