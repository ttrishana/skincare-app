import { ingredientById } from './data'
import { isLeaveOn } from './gaps'
import type { RoutineTime } from './routine'
import type { IngredientCategory, Product, ProductCategory } from '../types'

function hasIngredientCategory(product: Product, ...cats: IngredientCategory[]): boolean {
  return product.ingredientIds.some((id) => {
    const ing = ingredientById.get(id)
    return ing !== undefined && cats.some((c) => ing.category.includes(c))
  })
}

/**
 * Active-defined roles are checked across the whole routine — owning three
 * vitamin C serums is redundant no matter when they're applied. Rinse-off
 * products don't count (a BHA cleanser isn't a substitute for a BHA
 * treatment, or vice versa).
 */
const ACTIVE_ROLES: Array<{
  id: string
  label: string
  matches: (p: Product) => boolean
}> = [
  {
    id: 'retinoid',
    label: 'Retinoid',
    matches: (p) => isLeaveOn(p) && hasIngredientCategory(p, 'retinoid'),
  },
  {
    id: 'chemical-exfoliant',
    label: 'Chemical exfoliant',
    matches: (p) => isLeaveOn(p) && hasIngredientCategory(p, 'exfoliant-chemical'),
  },
  {
    id: 'vitamin-c',
    label: 'Vitamin C',
    matches: (p) => isLeaveOn(p) && hasIngredientCategory(p, 'vitamin-c'),
  },
  {
    id: 'peptide',
    label: 'Peptide',
    matches: (p) => isLeaveOn(p) && hasIngredientCategory(p, 'peptide'),
  },
]

/**
 * Structural roles are checked per time-of-day column: an AM and a PM
 * moisturizer is a normal setup, two moisturizers layered in the same
 * routine is a duplicate. Serums/treatments are deliberately excluded —
 * layering different serums is the whole point of the category, and true
 * duplicates there are caught by the active roles above.
 */
const STRUCTURAL_CATEGORIES: ProductCategory[] = ['cleanser', 'toner', 'moisturizer', 'spf']

export interface RedundancyGroup {
  id: string
  label: string
  products: Product[]
  /** Sum of known prices in the group. */
  pricedTotal: number
  /** pricedTotal minus the cheapest priced product — money tied up beyond one. */
  potentialSavings: number
  unpricedCount: number
}

function makeGroup(id: string, label: string, products: Product[]): RedundancyGroup {
  const prices = products
    .map((p) => p.priceUSD)
    .filter((n): n is number => n !== undefined)
  const pricedTotal = prices.reduce((a, b) => a + b, 0)
  const potentialSavings = prices.length > 1 ? pricedTotal - Math.min(...prices) : 0
  return {
    id,
    label,
    products,
    pricedTotal,
    potentialSavings,
    unpricedCount: products.length - prices.length,
  }
}

/**
 * Find sets of products serving the same primary role. Suggestions stay
 * brand-neutral (spec Phase 5): the report says "these serve the same
 * role", and savings assume keeping the least expensive — an objective
 * baseline, not an endorsement.
 */
export function findRedundancies(
  columns: Record<RoutineTime, Product[]>,
): RedundancyGroup[] {
  const groups: RedundancyGroup[] = []

  const unique = new Map<string, Product>()
  for (const p of [...columns.AM, ...columns.PM]) unique.set(p.id, p)
  const all = [...unique.values()]

  for (const role of ACTIVE_ROLES) {
    const matching = all.filter(role.matches)
    if (matching.length >= 2) {
      groups.push(makeGroup(role.id, role.label, matching))
    }
  }

  for (const time of ['AM', 'PM'] as RoutineTime[]) {
    for (const cat of STRUCTURAL_CATEGORIES) {
      const matching = columns[time].filter((p) => p.category === cat)
      if (matching.length >= 2) {
        groups.push(makeGroup(`${cat}-${time}`, `${capitalize(cat)} (${time})`, matching))
      }
    }
  }

  return groups
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function totalPotentialSavings(groups: RedundancyGroup[]): number {
  return groups.reduce((sum, g) => sum + g.potentialSavings, 0)
}
