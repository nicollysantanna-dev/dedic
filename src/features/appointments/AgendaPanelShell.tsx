import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'

export function AgendaPanelShell({
  children,
  open,
  onClose,
}: {
  children: React.ReactNode
  open: boolean
  onClose: () => void
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Fechar painel"
            className="fixed inset-0 z-[70] bg-slate-950/45"
            data-testid="agenda-panel-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <aside
            aria-modal="true"
            className="fixed bottom-0 left-0 right-0 z-[80] max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] bg-white p-5 text-slate-950 shadow-2xl sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-dvh sm:w-[28rem] sm:rounded-none sm:p-7"
            data-testid="agenda-panel"
            role="dialog"
          >
            {children}
          </aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
