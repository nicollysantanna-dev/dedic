import { KeyRound } from 'lucide-react'

export function SupabaseSetupPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f1e9] px-5 text-[#183529]">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#173d2c]/8 bg-white/65 p-7 shadow-xl">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#173d2c] text-white">
          <KeyRound size={22} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
          Última configuração
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.05em]">
          Conecte o Dedic ao Supabase.
        </h1>
        <p className="mt-4 leading-7 text-[#5d7167]">
          Adicione a chave Publishable do projeto em{' '}
          <code className="rounded bg-[#e7e1d4] px-1.5 py-0.5 text-sm">.env.local</code> e
          reinicie o servidor. Nunca use a chave secret ou service_role no navegador.
        </p>
      </section>
    </main>
  )
}
