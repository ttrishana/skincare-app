import { useState } from 'react'
import { ingredientById } from '../lib/data'
import type { CustomProduct, Product, ProductCategory } from '../types'

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
  product: Product
  onDelete?: (id: string) => void
  /** Times of day this product is currently in the routine. */
  routineTimes?: Array<'AM' | 'PM'>
  onToggleRoutine?: (productId: string, time: 'AM' | 'PM' | 'both') => void
}

export default function ProductCard({
  product,
  onDelete,
  routineTimes = [],
  onToggleRoutine,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const matched = product.ingredientIds
    .map((id) => ingredientById.get(id))
    .filter((i) => i !== undefined)
  const unmatched = product.isCustom
    ? (product as CustomProduct).unmatchedTokens ?? []
    : []

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        className="w-full cursor-pointer text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {product.brand}
            </p>
            <h3 className="font-medium text-stone-900">{product.name}</h3>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[product.category]}`}
          >
            {product.category}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-sm text-stone-500">
          {product.priceUSD !== undefined && <span>${product.priceUSD.toFixed(2)}</span>}
          {product.sizeMl !== undefined && <span>{product.sizeMl} ml</span>}
          {product.isCustom && (
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
              custom
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {matched.slice(0, expanded ? undefined : 6).map((ing) => (
            <span
              key={ing.id}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
            >
              {ing.commonName}
            </span>
          ))}
          {!expanded && matched.length > 6 && (
            <span className="px-1 text-xs text-stone-400">
              +{matched.length - 6} more
            </span>
          )}
          {unmatched.map((token) => (
            <span
              key={token}
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
              title="Not matched to a known ingredient"
            >
              {token}?
            </span>
          ))}
        </div>
      </button>

      {onToggleRoutine && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3">
          <span className="mr-1 text-xs text-stone-400">Routine:</span>
          {(['AM', 'PM'] as const).map((time) => {
            const active = routineTimes.includes(time)
            return (
              <button
                key={time}
                onClick={() => onToggleRoutine(product.id, time)}
                aria-pressed={active}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-stone-900 text-white hover:bg-stone-700'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
                }`}
                title={active ? `Remove from ${time} routine` : `Add to ${time} routine`}
              >
                {time === 'AM' ? '☀️' : '🌙'} {time}
                {active && ' ✓'}
              </button>
            )
          })}
          {routineTimes.length === 0 && (
            <button
              onClick={() => onToggleRoutine(product.id, 'both')}
              className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
            >
              Both
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {matched.map((ing) => (
            <div key={ing.id} className="text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-stone-800">{ing.commonName}</span>
                <span className="text-xs text-stone-400">{ing.inciName}</span>
              </div>
              <p className="text-xs text-stone-500">
                {ing.functions.join(' · ')}
                {ing.notes && <span className="text-stone-400"> — {ing.notes}</span>}
              </p>
            </div>
          ))}
          {!product.isCustom && (
            <p className="pt-1 text-xs italic text-stone-400">
              Key-ingredient mapping, not the full INCI list.
            </p>
          )}
          {product.isCustom && onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="mt-1 cursor-pointer rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
            >
              Delete custom product
            </button>
          )}
        </div>
      )}
    </div>
  )
}
