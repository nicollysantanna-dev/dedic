type GoalEditResult =
  | { ok: true; value: { targetValue: number; targetDate: string } }
  | { ok: false; error: string }

/** Valida a edição de uma meta; espelha as checagens da tabela `student_goals`. */
export function parseGoalEdit(input: {
  targetValue: string
  targetDate: string
  initialValue: number
  createdOn: string
}): GoalEditResult {
  const targetValue = Number(input.targetValue.replace(',', '.'))
  if (!input.targetValue || !Number.isFinite(targetValue) || targetValue <= 0) {
    return { ok: false, error: 'Informe um valor-alvo válido.' }
  }
  if (targetValue === input.initialValue) {
    return { ok: false, error: 'O valor-alvo precisa ser diferente do valor inicial.' }
  }
  if (!input.targetDate || input.targetDate < input.createdOn) {
    return { ok: false, error: 'O prazo não pode ser anterior à criação da meta.' }
  }
  return { ok: true, value: { targetValue, targetDate: input.targetDate } }
}
