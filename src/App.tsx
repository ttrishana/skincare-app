import ProductLibrary from './components/ProductLibrary'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Skincare Routine Optimizer
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Browse products, check ingredients, and (soon) build a conflict-free
            AM/PM routine.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">
        <ProductLibrary />
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
