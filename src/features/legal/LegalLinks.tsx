import { Link } from 'react-router-dom'

const linkClass =
  'font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4 hover:text-[var(--brand-hover)]'

/** Aviso do cadastro; os links abrem em nova aba para não perder o formulário. */
export function SignUpLegalNotice() {
  return (
    <p className="text-sm leading-6 text-slate-500">
      Ao criar sua conta, você concorda com os{' '}
      <Link className={linkClass} to="/termos" target="_blank" rel="noopener noreferrer">
        Termos de uso
      </Link>{' '}
      e a{' '}
      <Link
        className={linkClass}
        to="/privacidade"
        target="_blank"
        rel="noopener noreferrer"
      >
        Política de privacidade
      </Link>
      , inclusive com o tratamento dos dados de saúde que você registrar.
    </p>
  )
}

export function LegalFooterLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Documentos legais"
      className={`flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm ${className}`}
    >
      <Link
        className="text-slate-400 underline underline-offset-4 hover:text-white"
        to="/termos"
      >
        Termos de uso
      </Link>
      <Link
        className="text-slate-400 underline underline-offset-4 hover:text-white"
        to="/privacidade"
      >
        Política de privacidade
      </Link>
    </nav>
  )
}
