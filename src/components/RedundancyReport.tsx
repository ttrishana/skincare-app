import { useMemo } from 'react'
import { findRedundancies, totalPotentialSavings } from '../lib/redundancy'
import type { RoutineTime } from '../lib/routine'
import type { Product } from '../types'

const fmt = (n: number) => `$${n.toFixed(2).replace(/\.00$/, '')}`

interface Props {
  columns: Record<RoutineTime, Product[]>
}

export default function RedundancyReport({ columns }: Props) {
  const groups = useMemo(() => findRedundancies(columns), [columns])
  const total = totalPotentialSavings(groups)
  const productCount = new Set([...columns.AM, ...columns.PM].map((p) => p.id)).size

  if (productCount < 2) return null

  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-stone-900">💸 Redundancy &amp; spend</h2>
        {groups.length > 0 && total > 0 && (
          <span className="text-sm text-stone-500">
            ≈ {fmt(total)} tied up in overlapping products
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ No overlapping roles detected — each product is pulling its own weight.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-stone-900">
                  {g.products.length}× {g.label}
                </p>
                {g.potentialSavings > 0 && (
                  <p className="text-sm text-stone-600">
                    {fmt(g.potentialSavings)} beyond the least expensive
                  </p>
                )}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {g.products.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full bg-white px-2.5 py-0.5 text-xs text-stone-700 ring-1 ring-stone-200"
                  >
                    {p.brand} {p.name}
                    {p.priceUSD !== undefined && (
                      <span className="text-stone-400"> · {fmt(p.priceUSD)}</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-stone-500">
                These products serve the same role — most routines only need one.
                {g.unpricedCount > 0 &&
                  ` (${g.unpricedCount} without price data, excluded from the estimate.)`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
