import { useMemo, useState } from 'react'
import ProductLibrary from './components/ProductLibrary'
import RoutineBuilder from './components/RoutineBuilder'
import { seedProducts } from './lib/data'
import { loadCustomProducts, saveCustomProducts } from './lib/customProducts'
import { useRoutine } from './lib/useRoutine'
import type { CustomProduct } from './types'

type View = 'library' | 'routine'

export default function App() {
  const [view, setView] = useState<View>('library')
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>(loadCustomProducts)

  const allProducts = useMemo(
    () => [...customProducts, ...seedProducts],
    [customProducts],
  )
  const productById = useMemo(
    () => new Map(allProducts.map((p) => [p.id, p])),
    [allProducts],
  )
  const validIds = useMemo(() => new Set(productById.keys()), [productById])

  const routineApi = useRoutine(validIds)

  function addCustomProduct(product: CustomProduct) {
    const next = [product, ...customProducts]
    setCustomProducts(next)
    saveCustomProducts(next)
  }

  function deleteCustomProduct(id: string) {
    const next = customProducts.filter((p) => p.id !== id)
    setCustomProducts(next)
    saveCustomProducts(next)
    routineApi.removeEverywhere(id)
  }

  function toggleRoutine(productId: string, time: 'AM' | 'PM' | 'both') {
    if (time === 'both') {
      routineApi.add(productId, 'both')
      return
    }
    const times = routineApi.timesByProduct.get(productId) ?? []
    if (times.includes(time)) routineApi.remove(productId, time)
    else routineApi.add(productId, time)
  }

  const slotCount = routineApi.routine.slots.length

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">
              Skincare Routine Optimizer
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              Browse products, check ingredients, and build a conflict-free AM/PM routine.
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-stone-100 p-1" aria-label="Views">
            {(
              [
                ['library', 'Products'],
                ['routine', 'My Routine'],
              ] as Array<[View, string]>
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-current={view === v ? 'page' : undefined}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {label}
                {v === 'routine' && slotCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-stone-900 px-1.5 py-0.5 text-xs text-white">
                    {slotCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">
        {view === 'library' ? (
          <ProductLibrary
            products={allProducts}
            customCount={customProducts.length}
            onAddCustom={addCustomProduct}
            onDeleteCustom={deleteCustomProduct}
            routineTimesFor={(id) => routineApi.timesByProduct.get(id) ?? []}
            onToggleRoutine={toggleRoutine}
          />
        ) : (
          <RoutineBuilder
            api={routineApi}
            productById={productById}
            onBrowse={() => setView('library')}
          />
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 backdrop-blur">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-stone-500">
          Educational and organizational tool only — not medical or
          dermatological advice. Consult a dermatologist for skin concerns.
        </p>
      </footer>
    </div>
  )
}
