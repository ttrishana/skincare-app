import type { Routine, RoutineSlot } from '../types'

const STORAGE_KEY = 'skincare-app.routine.v1'

export type RoutineTime = 'AM' | 'PM'

// Internally every slot is 'AM' or 'PM'; a product used morning and night is
// stored as two slots so each column keeps its own layering order. 'both'
// remains valid in the type (and is split here on load).
function splitBoth(slots: RoutineSlot[]): RoutineSlot[] {
  return slots.flatMap((s) =>
    s.timeOfDay === 'both'
      ? [
          { ...s, timeOfDay: 'AM' as const },
          { ...s, timeOfDay: 'PM' as const },
        ]
      : [s],
  )
}

function renumber(slots: RoutineSlot[]): RoutineSlot[] {
  const byTime: Record<RoutineTime, number> = { AM: 0, PM: 0 }
  return [...slots]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ ...s, order: byTime[s.timeOfDay as RoutineTime]++ }))
}

export function loadRoutine(validProductIds?: Set<string>): Routine {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { slots: [] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.slots)) return { slots: [] }
    let slots = splitBoth(parsed.slots as RoutineSlot[])
    // Drop slots pointing at products that no longer exist (e.g. deleted customs)
    if (validProductIds) slots = slots.filter((s) => validProductIds.has(s.productId))
    return { slots: renumber(slots) }
  } catch {
    return { slots: [] }
  }
}

export function saveRoutine(routine: Routine): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routine))
}

export function slotsFor(routine: Routine, time: RoutineTime): RoutineSlot[] {
  return routine.slots
    .filter((s) => s.timeOfDay === time)
    .sort((a, b) => a.order - b.order)
}

export function hasProduct(routine: Routine, productId: string, time: RoutineTime): boolean {
  return routine.slots.some((s) => s.productId === productId && s.timeOfDay === time)
}

export function addProduct(
  routine: Routine,
  productId: string,
  time: RoutineTime | 'both',
): Routine {
  const times: RoutineTime[] = time === 'both' ? ['AM', 'PM'] : [time]
  const added: RoutineSlot[] = times
    .filter((t) => !hasProduct(routine, productId, t))
    .map((t) => ({ productId, timeOfDay: t, order: slotsFor(routine, t).length }))
  if (added.length === 0) return routine
  return { slots: [...routine.slots, ...added] }
}

export function removeProduct(
  routine: Routine,
  productId: string,
  time: RoutineTime,
): Routine {
  return {
    slots: renumber(
      routine.slots.filter((s) => !(s.productId === productId && s.timeOfDay === time)),
    ),
  }
}

/** Move the slot at `from` to position `to` within one time-of-day column. */
export function moveSlot(
  routine: Routine,
  time: RoutineTime,
  from: number,
  to: number,
): Routine {
  const column = slotsFor(routine, time)
  if (from < 0 || from >= column.length || to < 0 || to >= column.length || from === to) {
    return routine
  }
  const reordered = [...column]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)
  const other = routine.slots.filter((s) => s.timeOfDay !== time)
  return {
    slots: [...other, ...reordered.map((s, i) => ({ ...s, order: i }))],
  }
}
