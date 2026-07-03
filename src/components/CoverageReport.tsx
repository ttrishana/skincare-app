import { useMemo } from 'react'
import { analyzeCoverage } from '../lib/gaps'
import type { RoutineTime } from '../lib/routine'
import type { Product } from '../types'

interface Props {
  /** Products in this time-of-day column. */
  products: Product[]
  time: RoutineTime
}

export default function CoverageReport({ products, time }: Props) {
  const coverage = useMemo(() => analyzeCoverage(products, time), [products, time])

  if (products.length === 0) return null

  const missing = coverage.filter((c) => c.satisfiedBy.length === 0)

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Coverage
      </h3>
      <ul className="mt-2 space-y-1">
        {coverage.map(({ item, satisfiedBy }) => (
          <li key={item.id} className="flex items-baseline gap-2 text-sm">
            {satisfiedBy.length > 0 ? (
              <>
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                <span className="text-stone-700">
                  {item.label}
                  <span className="text-stone-400">
                    {' '}
                    — {satisfiedBy.map((p) => p.name).join(', ')}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span aria-hidden className="text-stone-400">
                  ○
                </span>
                <span className="text-stone-500">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-stone-200 pt-2">
          {missing.map(({ item }) => (
            <p key={item.id} className="text-xs text-stone-500">
              {item.missingMessage}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
