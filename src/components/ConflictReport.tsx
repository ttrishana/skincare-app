import { useMemo } from 'react'
import { findConflicts, type ConflictFinding } from '../lib/conflicts'
import { checkLayering } from '../lib/layering'
import type { ConflictSeverity, Product } from '../types'

const SEVERITY_UI: Record<
  ConflictSeverity,
  { label: string; badge: string; box: string }
> = {
  'avoid-same-routine': {
    label: 'Avoid same routine',
    badge: 'bg-rose-600 text-white',
    box: 'border-rose-200 bg-rose-50',
  },
  'space-out': {
    label: 'Space out',
    badge: 'bg-amber-500 text-white',
    box: 'border-amber-200 bg-amber-50',
  },
  'monitor-irritation': {
    label: 'Monitor irritation',
    badge: 'bg-stone-500 text-white',
    box: 'border-stone-200 bg-stone-100',
  },
}

interface Props {
  /** Products in this time-of-day column, in layering order. */
  products: Product[]
}

export default function ConflictReport({ products }: Props) {
  const conflicts = useMemo(() => findConflicts(products), [products])
  const layering = useMemo(() => checkLayering(products), [products])

  if (products.length < 2) return null

  if (conflicts.length === 0 && layering.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        ✓ No known conflicts or layering issues among these products.
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      {conflicts.map((f) => (
        <ConflictItem key={`${f.productA.id}|${f.productB.id}|${f.rule.id}`} finding={f} />
      ))}
      {layering.map((w, i) => (
        <div
          key={`${w.offender.id}|${w.other.id}|${i}`}
          className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm"
        >
          <span className="mr-2 inline-block rounded-full bg-sky-600 px-2 py-0.5 text-xs font-medium text-white">
            Layering order
          </span>
          <span className="text-sky-900">{w.message}</span>
        </div>
      ))}
    </div>
  )
}

function ConflictItem({ finding }: { finding: ConflictFinding }) {
  const { rule, productA, productB, triggers } = finding
  const ui = SEVERITY_UI[rule.severity]
  const shown = triggers.slice(0, 4)

  return (
    <div className={`rounded-lg border p-3 text-sm ${ui.box}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ui.badge}`}>
          {ui.label}
        </span>
        <span className="font-medium text-stone-900">
          {productA.name} × {productB.name}
        </span>
      </div>
      <p className="mt-1.5 text-stone-700">{rule.reason}</p>
      <p className="mt-1 text-stone-600">
        <span className="font-medium">Suggestion:</span> {rule.recommendation}
      </p>
      <p className="mt-1.5 text-xs text-stone-500">
        Triggered by:{' '}
        {shown.map((t, i) => (
          <span key={`${t.a.id}|${t.b.id}`}>
            {i > 0 && ' · '}
            <span className="font-medium">{t.a.commonName}</span> ({productA.name}) ×{' '}
            <span className="font-medium">{t.b.commonName}</span> ({productB.name})
          </span>
        ))}
        {triggers.length > shown.length && ` · +${triggers.length - shown.length} more`}
      </p>
    </div>
  )
}
