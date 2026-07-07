import { useMemo, useState } from 'react'
import { ingredients, ingredientById } from '../lib/data'
import { matchInciList, type TokenMatch } from '../lib/matching'
import { normalizeName } from '../lib/fuzzyMatch'
import { makeCustomProductId } from '../lib/customProducts'
import {
  describeClaudeError,
  extractWithClaude,
  loadApiKey,
  saveApiKey,
} from '../lib/claudeExtract'
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

const pct = (n: number) => `${Math.round(n * 100)}%`

type Decision = 'accepted' | 'rejected'

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
  // Accept/reject decisions for low-confidence fuzzy suggestions, by token
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  // Manual assignments for unmatched/rejected tokens: token -> id ('' = leave unmatched)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const [apiKey, setApiKey] = useState(loadApiKey)
  const [claudeStatus, setClaudeStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [claudeMessage, setClaudeMessage] = useState('')

  const matches = useMemo(() => matchInciList(inciText), [inciText])

  // How each token resolves given current decisions/overrides
  function resolvedId(m: TokenMatch): string | null | 'pending' {
    if (m.ingredient && !m.needsConfirmation) return m.ingredient.id
    if (m.ingredient && m.needsConfirmation) {
      const d = decisions[m.token]
      if (d === 'accepted') return m.ingredient.id
      if (d === 'rejected') return overrides[m.token] || null
      return 'pending'
    }
    return overrides[m.token] || null
  }

  const pending = matches.filter((m) => resolvedId(m) === 'pending')
  const confirmable = matches.filter((m) => m.needsConfirmation)
  const unmatched = matches.filter((m) => {
    const r = resolvedId(m)
    return r === null
  })
  const matchedCount = matches.filter((m) => {
    const r = resolvedId(m)
    return r !== null && r !== 'pending'
  }).length

  function handleSave() {
    const ingredientIds: string[] = []
    const unmatchedTokens: string[] = []
    for (const m of matches) {
      const r = resolvedId(m)
      if (r && r !== 'pending') {
        if (!ingredientIds.includes(r)) ingredientIds.push(r)
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

  async function handleClaudeParse() {
    setClaudeStatus('loading')
    setClaudeMessage('')
    try {
      saveApiKey(apiKey)
      const extracted = await extractWithClaude(inciText, apiKey)
      const byRaw = new Map(extracted.map((e) => [normalizeName(e.raw), e]))
      let applied = 0
      const nextOverrides = { ...overrides }
      const nextDecisions = { ...decisions }
      for (const m of matches) {
        if (resolvedId(m) === m.ingredient?.id) continue // already resolved locally
        const e = byRaw.get(normalizeName(m.token))
        if (!e?.ingredientId) continue
        // Claude agrees with a pending local suggestion -> auto-accept it;
        // otherwise fill it in as an override the user can still change.
        if (m.needsConfirmation && m.ingredient?.id === e.ingredientId) {
          nextDecisions[m.token] = 'accepted'
        } else if (!m.ingredient || decisions[m.token] === 'rejected') {
          nextOverrides[m.token] = e.ingredientId
        } else {
          continue
        }
        applied++
      }
      setOverrides(nextOverrides)
      setDecisions(nextDecisions)
      setClaudeStatus('done')
      setClaudeMessage(
        applied > 0
          ? `Claude resolved ${applied} additional ingredient${applied === 1 ? '' : 's'} — review before saving.`
          : 'Claude found no additional matches beyond the local matcher.',
      )
    } catch (error) {
      setClaudeStatus('error')
      setClaudeMessage(describeClaudeError(error))
    }
  }

  const canSave = name.trim().length > 0 && matches.length > 0 && pending.length === 0

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
              {matchedCount} of {matches.length} ingredients matched
              {pending.length > 0 && (
                <span className="text-amber-700"> · {pending.length} awaiting confirmation</span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {matches.map((m, idx) => {
                const r = resolvedId(m)
                if (r === 'pending') {
                  return (
                    <span
                      key={`${m.token}-${idx}`}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                      title={`Suggested: ${m.ingredient!.commonName} (${pct(m.confidence)})`}
                    >
                      ? {m.token}
                    </span>
                  )
                }
                if (r) {
                  const ing = ingredientById.get(r)!
                  const fuzzy = m.method === 'fuzzy' && m.ingredient?.id === r
                  return (
                    <span
                      key={`${m.token}-${idx}`}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                      title={
                        fuzzy
                          ? `"${m.token}" fuzzy-matched at ${pct(m.confidence)} confidence`
                          : `Matched: ${ing.inciName}`
                      }
                    >
                      {fuzzy ? '≈' : '✓'} {ing.commonName}
                      {fuzzy && <span className="text-emerald-500"> {pct(m.confidence)}</span>}
                    </span>
                  )
                }
                return (
                  <span
                    key={`${m.token}-${idx}`}
                    className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500"
                  >
                    ✗ {m.token}
                  </span>
                )
              })}
            </div>

            {confirmable.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg bg-amber-50/60 p-3">
                <p className="text-xs text-amber-800">
                  Low-confidence matches — confirm or reject each suggestion.
                </p>
                {confirmable.map((m) => (
                  <div key={m.token} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-stone-600">
                      {m.token}
                    </span>
                    <span className="text-xs text-stone-700">
                      → {m.ingredient!.commonName}{' '}
                      <span className="text-stone-400">{pct(m.confidence)}</span>
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDecisions({ ...decisions, [m.token]: 'accepted' })}
                        aria-pressed={decisions[m.token] === 'accepted'}
                        className={`cursor-pointer rounded-md px-2 py-0.5 text-xs ${
                          decisions[m.token] === 'accepted'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => setDecisions({ ...decisions, [m.token]: 'rejected' })}
                        aria-pressed={decisions[m.token] === 'rejected'}
                        className={`cursor-pointer rounded-md px-2 py-0.5 text-xs ${
                          decisions[m.token] === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {unmatched.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg bg-stone-50 p-3">
                <p className="text-xs text-stone-600">
                  Unmatched ingredients — tag them manually or leave unmatched.
                  Unmatched ingredients are kept on the product but ignored by
                  conflict checks.
                </p>
                {unmatched.map((m) => (
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

            <div className="mt-3 rounded-lg border border-stone-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClaudeParse}
                  disabled={claudeStatus === 'loading' || !apiKey || !inciText.trim()}
                  className="cursor-pointer rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {claudeStatus === 'loading' ? 'Parsing…' : '✨ Parse with Claude'}
                </button>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Anthropic API key (sk-ant-…)"
                  className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-900 focus:border-stone-500 focus:outline-none"
                  aria-label="Anthropic API key"
                />
              </div>
              <p className="mt-1.5 text-xs text-stone-400">
                Optional fallback for messy labels: Claude re-parses the blob and fills in
                what the local matcher missed. The key is stored only in this browser.
              </p>
              {claudeMessage && (
                <p
                  className={`mt-1.5 text-xs ${
                    claudeStatus === 'error' ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {claudeMessage}
                </p>
              )}
            </div>
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
            title={pending.length > 0 ? 'Confirm or reject the suggested matches first' : undefined}
            className="cursor-pointer rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save product
          </button>
        </div>
      </div>
    </div>
  )
}
