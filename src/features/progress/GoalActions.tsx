import { LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { parseGoalEdit } from '@/features/progress/goal-form'
import {
  useDeleteGoal,
  useUpdateGoal,
  type GoalWithExercise,
} from '@/features/progress/queries'

/** Editar e excluir uma meta; disponível para o aluno e o personal da meta. */
export function GoalActions({
  goal,
  studentId,
}: {
  goal: GoalWithExercise
  studentId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const remove = useDeleteGoal(studentId)

  return (
    <div className="mt-3">
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Excluir esta meta?</span>
          <Button
            className="h-8 px-3 text-xs text-red-700"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(goal.id, { onSuccess: () => setIsConfirming(false) })
            }
            variant="outline"
          >
            {remove.isPending && <LoaderCircle className="animate-spin" size={14} />}
            Confirmar exclusão
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            disabled={remove.isPending}
            onClick={() => setIsConfirming(false)}
            variant="ghost"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            className="h-8 px-3 text-xs"
            onClick={() => setIsEditing(true)}
            variant="ghost"
          >
            <Pencil size={14} /> Editar meta
          </Button>
          <Button
            className="h-8 px-3 text-xs text-red-700"
            onClick={() => setIsConfirming(true)}
            variant="ghost"
          >
            <Trash2 size={14} /> Excluir meta
          </Button>
        </div>
      )}
      {remove.error && (
        <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          Não foi possível excluir a meta. Tente novamente.
        </p>
      )}
      {isEditing && (
        <GoalEditDialog
          goal={goal}
          studentId={studentId}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}

function GoalEditDialog({
  goal,
  studentId,
  onClose,
}: {
  goal: GoalWithExercise
  studentId: string
  onClose: () => void
}) {
  const [targetValue, setTargetValue] = useState(
    String(Number(goal.target_value)).replace('.', ','),
  )
  const [targetDate, setTargetDate] = useState(goal.target_date)
  const [formError, setFormError] = useState('')
  const update = useUpdateGoal(studentId)
  const createdOn = goal.created_at.slice(0, 10)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const parsed = parseGoalEdit({
      targetValue,
      targetDate,
      initialValue: Number(goal.initial_value),
      createdOn,
    })
    if (!parsed.ok) {
      setFormError(parsed.error)
      return
    }
    update.mutate({ goalId: goal.id, ...parsed.value }, { onSuccess: onClose })
  }

  return (
    <Dialog
      title="Editar meta"
      eyebrow="Evolução"
      onClose={onClose}
      pending={update.isPending}
    >
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Valor-alvo
          <input
            className="field mt-2"
            inputMode="decimal"
            onChange={(event) => setTargetValue(event.target.value)}
            value={targetValue}
          />
        </label>
        <label className="block text-sm font-semibold">
          Prazo
          <input
            className="field mt-2"
            min={createdOn}
            onChange={(event) => setTargetDate(event.target.value)}
            required
            type="date"
            value={targetDate}
          />
        </label>
        {(formError || update.error) && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {formError || 'Não foi possível salvar a meta. Tente novamente.'}
          </p>
        )}
        <Button className="w-full" disabled={update.isPending} type="submit">
          {update.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Salvar meta
        </Button>
      </form>
    </Dialog>
  )
}
