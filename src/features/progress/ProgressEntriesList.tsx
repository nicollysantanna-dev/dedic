import { LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ProgressEntryDialog } from '@/features/progress/ProgressEntryDialog'
import { measurementFields } from '@/features/progress/progress-summary'
import {
  useDeleteProgressEntry,
  type ProgressEntryWithAuthor,
} from '@/features/progress/queries'
import { formatDateOnly } from '@/lib/format'

function describeMeasurements(entry: ProgressEntryWithAuthor) {
  const saved = (entry.measurements ?? {}) as Record<string, unknown>
  return measurementFields
    .filter((field) => typeof saved[field.key] === 'number')
    .map(
      (field) =>
        `${field.label} ${(saved[field.key] as number).toLocaleString('pt-BR')} cm`,
    )
    .join(' · ')
}

/** Histórico de peso e medidas; aluno e personal vinculado editam e excluem. */
export function ProgressEntriesList({
  entries,
  studentId,
}: {
  entries: readonly ProgressEntryWithAuthor[]
  studentId: string
}) {
  const [editing, setEditing] = useState<ProgressEntryWithAuthor | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const remove = useDeleteProgressEntry(studentId)

  if (!entries.length) {
    return <p className="text-sm text-slate-500">Nenhum registro ainda.</p>
  }

  return (
    <>
      {remove.error && (
        <p className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          Não foi possível excluir o registro. Tente novamente.
        </p>
      )}
      <ul className="space-y-2">
        {entries.map((entry) => {
          const date = formatDateOnly(entry.recorded_on)
          const measurements = describeMeasurements(entry)
          const isConfirming = confirmingId === entry.id
          return (
            <li key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {date}
                    {entry.weight_kg !== null &&
                      ` · ${Number(entry.weight_kg).toLocaleString('pt-BR')} kg`}
                  </p>
                  {measurements && <p className="text-slate-600">{measurements}</p>}
                  {entry.note && <p className="text-slate-600">{entry.note}</p>}
                  {entry.author && (
                    <p className="text-xs text-slate-500">
                      Registrado por {entry.author.full_name}
                    </p>
                  )}
                </div>
                {!isConfirming && (
                  <div className="flex gap-1">
                    <Button
                      aria-label={`Editar registro de ${date}`}
                      className="h-9 px-2"
                      onClick={() => setEditing(entry)}
                      variant="ghost"
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      aria-label={`Excluir registro de ${date}`}
                      className="h-9 px-2 text-red-700"
                      onClick={() => setConfirmingId(entry.id)}
                      variant="ghost"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
              </div>
              {isConfirming && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-slate-600">Excluir este registro?</span>
                  <Button
                    className="h-8 px-3 text-xs text-red-700"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(entry.id, { onSuccess: () => setConfirmingId(null) })
                    }
                    variant="outline"
                  >
                    {remove.isPending && (
                      <LoaderCircle className="animate-spin" size={14} />
                    )}
                    Confirmar exclusão
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    disabled={remove.isPending}
                    onClick={() => setConfirmingId(null)}
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {editing && (
        <ProgressEntryDialog
          studentId={studentId}
          mode={{ kind: 'edit', entry: editing }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
