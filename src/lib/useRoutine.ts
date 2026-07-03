import { useEffect, useMemo, useState } from 'react'
import type { Routine } from '../types'
import {
  addProduct,
  loadRoutine,
  moveSlot,
  removeProduct,
  saveRoutine,
  type RoutineTime,
} from './routine'

export function useRoutine(validProductIds: Set<string>) {
  const [routine, setRoutine] = useState<Routine>(() => loadRoutine(validProductIds))

  useEffect(() => {
    saveRoutine(routine)
  }, [routine])

  const timesByProduct = useMemo(() => {
    const map = new Map<string, RoutineTime[]>()
    for (const s of routine.slots) {
      if (s.timeOfDay === 'both') continue // never stored, but keeps TS honest
      const list = map.get(s.productId) ?? []
      list.push(s.timeOfDay)
      map.set(s.productId, list)
    }
    return map
  }, [routine])

  return {
    routine,
    timesByProduct,
    add: (productId: string, time: RoutineTime | 'both') =>
      setRoutine((prev) => addProduct(prev, productId, time)),
    remove: (productId: string, time: RoutineTime) =>
      setRoutine((prev) => removeProduct(prev, productId, time)),
    move: (time: RoutineTime, from: number, to: number) =>
      setRoutine((prev) => moveSlot(prev, time, from, to)),
    removeEverywhere: (productId: string) =>
      setRoutine((prev) => ({
        slots: prev.slots.filter((s) => s.productId !== productId),
      })),
  }
}

export type RoutineApi = ReturnType<typeof useRoutine>
