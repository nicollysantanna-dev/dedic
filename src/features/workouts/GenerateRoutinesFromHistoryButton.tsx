import { CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useGenerateRoutinesFromHistory } from '@/features/workouts/routine-queries'

/**
 * Botão "Gerar fichas": transforma nome de treino que se repete no histórico
 * (nativo ou importado do Hevy) em ficha pronta, usando a sessão mais recente
 * como molde. Sob demanda — nunca dispara sozinho (ver ADR 0007).
 */
export function GenerateRoutinesFromHistoryButton() {
  const generate = useGenerateRoutinesFromHistory()

  const created = generate.data?.filter((item) => item.status === 'created').length ?? 0
  const updated = generate.data?.filter((item) => item.status === 'updated').length ?? 0
  const skipped = generate.data?.filter((item) => item.status === 'skipped').length ?? 0

  return (
    <div>
      <Button
        disabled={generate.isPending}
        onClick={() => generate.mutate()}
        variant="outline"
      >
        {generate.isPending ? (
          <LoaderCircle className="animate-spin" size={17} />
        ) : (
          <Sparkles size={17} />
        )}
        Gerar fichas
      </Button>

      {generate.isSuccess && created + updated === 0 && (
        <p className="mt-2 text-xs text-slate-400" role="status">
          Nenhum padrão encontrado ainda. Treine com o mesmo nome de treino pelo menos
          duas vezes para gerar uma ficha automaticamente.
        </p>
      )}
      {generate.isSuccess && created + updated > 0 && (
        <p
          className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400"
          role="status"
        >
          <CheckCircle2 className="shrink-0" size={14} />
          {created > 0 &&
            `${created} ficha${created === 1 ? '' : 's'} criada${created === 1 ? '' : 's'}`}
          {created > 0 && updated > 0 && ', '}
          {updated > 0 && `${updated} atualizada${updated === 1 ? '' : 's'}`}.
          {skipped > 0 &&
            ` ${skipped} ficha${skipped === 1 ? '' : 's'} arquivada${skipped === 1 ? '' : 's'} não ${skipped === 1 ? 'foi alterada' : 'foram alteradas'}.`}
        </p>
      )}
      {generate.isError && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          Não foi possível gerar fichas. Tente novamente.
        </p>
      )}
    </div>
  )
}
