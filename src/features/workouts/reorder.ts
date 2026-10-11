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
