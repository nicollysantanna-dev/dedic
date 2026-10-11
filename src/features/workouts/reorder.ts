/** Move um item de uma posição para outra sem alterar a lista recebida. */
export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const inRange = (index: number) =>
    Number.isInteger(index) && index >= 0 && index < items.length
  if (!inRange(fromIndex) || !inRange(toIndex) || fromIndex === toIndex) return [...items]

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

/**
 * Aplica uma ordem de ids a uma lista. Itens fora da ordem ficam no fim, na ordem em que
 * estavam; ids desconhecidos são ignorados.
 */
export function applyOrder<T extends { id: string }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered = orderedIds.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
  const placed = new Set(ordered.map((item) => item.id))
  return [...ordered, ...items.filter((item) => !placed.has(item.id))]
}
