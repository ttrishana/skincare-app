import { useMemo, useState } from 'react'
import { ingredients } from '../lib/data'
import { matchInciList } from '../lib/matching'
import { makeCustomProductId } from '../lib/customProducts'
import type { CustomProduct, ProductCategory } from '../types'

const CATEGORIES: ProductCategory[] = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'spf',
  'treatment',
  'mask',
]

const sortedIngredients = [...ingredients].sort((a, b) =>
  a.commonName.localeCompare(b.commonName),
)

interface Props {
  onSave: (product: CustomProduct) => void
  onClose: () => void
}

export default function AddCustomProduct({ onSave, onClose }: Props) {
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('serum')
  const [price, setPrice] = useState('')
  const [inciText, setInciText] = useState('')
  // Manual assignments for unmatched tokens: token -> ingredient id ('' = leave unmatched)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const matches = useMemo(() => matchInciList(inciText), [inciText])
  const matchedCount = matches.filter(
    (m) => m.ingredient || overrides[m.token],
  ).length

  function handleSave() {
    const ingredientIds: string[] = []
    const unmatchedTokens: string[] = []
    for (const m of matches) {
      const id = m.ingredient?.id ?? overrides[m.token]
      if (id) {
        if (!ingredientIds.includes(id)) ingredientIds.push(id)
      } else {
        unmatchedTokens.push(m.token)
      }
    }
    onSave({
      id: makeCustomProductId(brand, name),
      brand: brand.trim() || 'Unbranded',
      name: name.trim(),
      category,
      ingredientIds,
      priceUSD: price ? Number(price) : undefined,
      isCustom: true,
      unmatchedTokens,
    })
  }

  const canSave = name.trim().length > 0 && matches.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add custom product"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Add custom product</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-stone-600">
            Brand
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none"
              placeholder="e.g. The Ordinary"
            />
          </label>
          <label className="text-sm text-stone-600">
            Product name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none"
              placeholder="e.g. Niacinamide 10%"
            />
          </label>
          <label className="text-sm text-stone-600">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-stone-600">
            Price (USD, optional)
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none"
              placeholder="e.g. 12.99"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm text-stone-600">
          Ingredient list (comma-separated, as printed on the label)
          <textarea
            value={inciText}
            onChange={(e) => setInciText(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm text-stone-900 focus:border-stone-500 focus:outline-none"
            placeholder="Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, ..."
          />
        </label>

        {matches.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-stone-700">
              {matchedCount} of {matches.length} ingredients recognized
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {matches.map((m, idx) =>
                m.ingredient ? (
                  <span
                    key={`${m.token}-${idx}`}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                    title={`Matched: ${m.ingredient.inciName}`}
                  >
                    ✓ {m.ingredient.commonName}
                  </span>
                ) : (
                  <span
                    key={`${m.token}-${idx}`}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                  >
                    ? {m.token}
                  </span>
                ),
              )}
            </div>

            {matches.some((m) => !m.ingredient) && (
              <div className="mt-3 space-y-2 rounded-lg bg-amber-50/60 p-3">
                <p className="text-xs text-amber-800">
                  Unrecognized ingredients — tag them manually or leave unmatched.
                  Unmatched ingredients are kept on the product but ignored by
                  conflict checks.
                </p>
                {matches
                  .filter((m) => !m.ingredient)
                  .map((m) => (
                    <div key={m.token} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-stone-600">
                        {m.token}
                      </span>
                      <select
                        value={overrides[m.token] ?? ''}
                        onChange={(e) =>
                          setOverrides({ ...overrides, [m.token]: e.target.value })
                        }
                        className="w-52 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900"
                      >
                        <option value="">— leave unmatched —</option>
                        {sortedIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.commonName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="cursor-pointer rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save product
          </button>
        </div>
      </div>
    </div>
  )
}
