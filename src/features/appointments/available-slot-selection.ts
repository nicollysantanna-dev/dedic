type AvailableSlot = { slot_start: string; slot_end: string }

export function isSelectionWithinAvailableSlots(
  startsAt: Date,
  endsAt: Date,
  availableSlots: readonly AvailableSlot[],
) {
  return availableSlots.some(
    (slot) =>
      startsAt.getTime() >= new Date(slot.slot_start).getTime() &&
      endsAt.getTime() <= new Date(slot.slot_end).getTime(),
  )
}
