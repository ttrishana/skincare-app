import { useRef, useState } from 'react'
import { slotsFor, type RoutineTime } from '../lib/routine'
import type { RoutineApi } from '../lib/useRoutine'
import type { Product, ProductCategory } from '../types'

const CATEGORY_STYLES: Record<ProductCategory, string> = {
  cleanser: 'bg-sky-100 text-sky-800',
  toner: 'bg-teal-100 text-teal-800',
  serum: 'bg-violet-100 text-violet-800',
  moisturizer: 'bg-emerald-100 text-emerald-800',
  spf: 'bg-amber-100 text-amber-800',
  treatment: 'bg-rose-100 text-rose-800',
  mask: 'bg-indigo-100 text-indigo-800',
}

interface Props {
  api: RoutineApi
  productById: Map<string, Product>
  onBrowse: () => void
}

export default function RoutineBuilder({ api, productById, onBrowse }: Props) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RoutineColumn time="AM" icon="☀️" api={api} productById={productById} onBrowse={onBrowse} />
      <RoutineColumn time="PM" icon="🌙" api={api} productById={productById} onBrowse={onBrowse} />
    </section>
  )
}

function RoutineColumn({
  time,
  icon,
  api,
  productById,
  onBrowse,
}: Props & { time: RoutineTime; icon: string }) {
  const slots = slotsFor(api.routine, time)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Live-reorder while dragging: the list mutates under the pointer, so track
  // the item's current index in a ref updated on every crossover.
  const currentIndex = useRef<number | null>(null)

  function handleDragStart(index: number) {
    setDragIndex(index)
    currentIndex.current = index
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault()
    const from = currentIndex.current
    if (from === null || from === overIndex) return
    api.move(time, from, overIndex)
    currentIndex.current = overIndex
  }

  function handleDragEnd() {
    setDragIndex(null)
    currentIndex.current = null
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-stone-900">
          {icon} {time} routine
        </h2>
        <span className="text-sm text-stone-500">
          {slots.length} product{slots.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-stone-400">
        Drag to set layering order (applied top to bottom).
      </p>

      {slots.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          <p>No {time} products yet.</p>
          <button
            onClick={onBrowse}
            className="mt-2 cursor-pointer font-medium text-stone-900 underline underline-offset-2 hover:text-stone-600"
          >
            Browse the product library
          </button>
        </div>
      ) : (
        <ol className="mt-3 space-y-2">
          {slots.map((slot, i) => {
            const product = productById.get(slot.productId)
            if (!product) return null
            return (
              <li
                key={`${slot.productId}-${time}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 ${
                  dragIndex !== null ? 'cursor-grabbing' : 'cursor-grab'
                } ${currentIndex.current === i && dragIndex !== null ? 'border-stone-400 shadow-md' : ''}`}
              >
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-stone-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {product.brand}
                  </p>
                  <p className="truncate text-sm font-medium text-stone-900">{product.name}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[product.category]}`}
                >
                  {product.category}
                </span>
                <div className="flex shrink-0 flex-col">
                  <button
                    onClick={() => api.move(time, i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move ${product.name} up`}
                    className="cursor-pointer px-1 text-xs leading-3 text-stone-400 hover:text-stone-900 disabled:cursor-default disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => api.move(time, i, i + 1)}
                    disabled={i === slots.length - 1}
                    aria-label={`Move ${product.name} down`}
                    className="cursor-pointer px-1 text-xs leading-3 text-stone-400 hover:text-stone-900 disabled:cursor-default disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => api.remove(slot.productId, time)}
                  aria-label={`Remove ${product.name} from ${time} routine`}
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
