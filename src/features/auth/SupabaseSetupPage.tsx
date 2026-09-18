import { KeyRound } from 'lucide-react'

export function SupabaseSetupPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--app-bg)] px-5 text-white">
      <section className="w-full max-w-lg rounded-[1.75rem] bg-white p-7 text-slate-950 shadow-2xl">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand)] text-white">
          <KeyRound size={22} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
          Última configuração
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
          Conecte o Dedic ao Supabase.
        </h1>
        <p className="mt-4 leading-7 text-slate-500">
          Adicione a chave Publishable do projeto em{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env.local</code> e
          reinicie o servidor. Nunca use a chave secret ou service_role no navegador.
        </p>
      </section>
    </main>
  )
}
