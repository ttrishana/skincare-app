import { useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import AddCustomProduct from './AddCustomProduct'
import type { CustomProduct, Product, ProductCategory } from '../types'

const CATEGORIES: Array<ProductCategory | 'all'> = [
  'all',
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'spf',
  'treatment',
  'mask',
]

interface Props {
  products: Product[]
  customCount: number
  onAddCustom: (product: CustomProduct) => void
  onDeleteCustom: (id: string) => void
  routineTimesFor: (productId: string) => Array<'AM' | 'PM'>
  onToggleRoutine: (productId: string, time: 'AM' | 'PM' | 'both') => void
}

export default function ProductLibrary({
  products,
  customCount,
  onAddCustom,
  onDeleteCustom,
  routineTimesFor,
  onToggleRoutine,
}: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return `${p.brand} ${p.name}`.toLowerCase().includes(q)
    })
  }, [products, query, category])

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product or brand…"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none sm:max-w-sm"
          aria-label="Search products"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 cursor-pointer rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-700"
        >
          + Add custom product
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm capitalize transition-colors ${
              category === c
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-stone-500">
        {filtered.length} product{filtered.length === 1 ? '' : 's'}
        {customCount > 0 && ` · ${customCount} custom`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          <p className="font-medium">No products found</p>
          <p className="mt-1 text-sm">
            Try a different search, or add it as a custom product by pasting its
            ingredient list.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onDelete={p.isCustom ? onDeleteCustom : undefined}
              routineTimes={routineTimesFor(p.id)}
              onToggleRoutine={onToggleRoutine}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddCustomProduct
          onSave={(p) => {
            onAddCustom(p)
            setShowAdd(false)
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </section>
  )
}
