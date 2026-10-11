import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

import { reorderItems } from '@/features/workouts/reorder'
import { cn } from '@/lib/utils'

type Identified = { id: string }

/**
 * Lista que se reordena arrastando a alça de cada item. Funciona com toque (celular),
 * mouse e teclado (setas + espaço). Ao soltar, devolve a nova ordem de ids.
 */
export function SortableList<T extends Identified>({
  items,
  label,
  onReorder,
  renderItem,
  className,
  handleClassName,
}: {
  items: T[]
  label: string
  onReorder: (orderedIds: string[]) => void
  renderItem: (item: T, handle: ReactNode) => ReactNode
  className?: string
  handleClassName?: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Avisos para leitor de tela em português (o padrão do dnd-kit é em inglês).
  const position = (id: string | number) => items.findIndex((item) => item.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Item ${position(active.id)} de ${items.length} pego. Use as setas para mover e espaço para soltar.`,
    onDragOver: ({ over }) =>
      over ? `Posição ${position(over.id)} de ${items.length}.` : 'Fora da lista.',
    onDragEnd: ({ over }) =>
      over
        ? `Item solto na posição ${position(over.id)} de ${items.length}.`
        : 'Item solto.',
    onDragCancel: () => 'Movimento cancelado. O item voltou para a posição original.',
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    const next = reorderItems(items, from, to)
    onReorder(next.map((item) => item.id))
  }

  return (
    <DndContext
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Para reordenar, pressione espaço para pegar o item, use as setas para mover e espaço para soltar. Esc cancela.',
        },
      }}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={cn('grid gap-3', className)} aria-label={label}>
          {items.map((item) => (
            <SortableItem
              handleClassName={handleClassName}
              id={item.id}
              key={item.id}
              label={label}
            >
              {(handle) => renderItem(item, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  id,
  label,
  handleClassName,
  children,
}: {
  id: string
  label: string
  handleClassName?: string
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const handle = (
    <button
      aria-label={`Arrastar para reordenar: ${label}`}
      className={cn(
        'grid size-10 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-slate-400 hover:bg-slate-400/15 active:cursor-grabbing',
        handleClassName,
      )}
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} />
    </button>
  )

  return (
    <li
      className={cn('min-w-0', isDragging && 'relative z-10 opacity-90')}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </li>
  )
}
