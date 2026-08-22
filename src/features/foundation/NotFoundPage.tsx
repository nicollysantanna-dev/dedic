import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f1e9] px-6 text-center text-[#183529]">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#a47b2e]">
          404
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-[-0.05em]">
          Essa página saiu para treinar.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[#587064]">
          O endereço não existe ou ainda não faz parte deste marco do Dedic.
        </p>
        <Button asChild className="mt-7">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  )
}
