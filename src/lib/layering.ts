import { ingredientById } from './data'
import type { Product, ProductCategory } from '../types'

/**
 * General thinnest-to-thickest layering guidance by product category.
 * Advisory only — plenty of valid routines break these (see spec Phase 3:
 * "general sequencing guidance", not rules).
 */
const LAYER_RANK: Record<ProductCategory, number> = {
  cleanser: 0,
  mask: 1, // rinse-off masks happen right after cleansing
  toner: 2,
  treatment: 3,
  serum: 4,
  moisturizer: 5,
  spf: 6,
}

export interface LayeringWarning {
  /** The product that appears too late (or, for SPF, too early). */
  offender: Product
  /** The product it was compared against. */
  other: Product
  message: string
}

/** True if the product carries a pH-dependent active (direct acids, L-AA). */
function hasPhSensitiveActive(product: Product): boolean {
  return product.ingredientIds.some((id) => {
    const ing = ingredientById.get(id)
    return (
      ing?.phSensitive &&
      (ing.category.includes('exfoliant-chemical') || ing.category.includes('vitamin-c'))
    )
  })
}

/**
 * Flag order inversions against the thinnest-to-thickest guidance for one
 * time-of-day column (products in their current layering order).
 *
 * One misplaced product can invert against several others; to stay readable
 * this reports one warning per misplaced product (based on its first
 * higher-rank predecessor), and at most one "SPF should be last" warning
 * per sunscreen.
 */
export function checkLayering(ordered: Product[]): LayeringWarning[] {
  const warnings: LayeringWarning[] = []
  const flaggedSpf = new Set<string>()

  for (let j = 0; j < ordered.length; j++) {
    const later = ordered[j]
    const first = ordered
      .slice(0, j)
      .find((e) => LAYER_RANK[e.category] > LAYER_RANK[later.category])
    if (!first) continue

    if (first.category === 'spf') {
      if (!flaggedSpf.has(first.id)) {
        flaggedSpf.add(first.id)
        warnings.push({
          offender: first,
          other: later,
          message: `Sunscreen should be the last step — ${first.name} has other products layered on top of it, which can disrupt its protective film.`,
        })
      }
      continue
    }

    let message: string
    if (later.category === 'cleanser') {
      message = `${later.name} is a cleanser — it rinses off, so it belongs before leave-on products like ${first.name}.`
    } else if (
      LAYER_RANK[first.category] >= LAYER_RANK.moisturizer &&
      hasPhSensitiveActive(later)
    ) {
      message = `${later.name} contains pH-dependent actives that work best on bare skin — applying it after ${first.name} (${first.category}) can blunt it. General order: ${later.category} before ${first.category}.`
    } else {
      message = `${later.name} (${later.category}) is layered after ${first.name} (${first.category}) — general guidance is thinnest to thickest: ${later.category} before ${first.category}.`
    }
    warnings.push({ offender: later, other: first, message })
  }

  return warnings
}
