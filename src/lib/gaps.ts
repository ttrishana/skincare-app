import { ingredientById } from './data'
import type { RoutineTime } from './routine'
import type { IngredientCategory, Product } from '../types'

function hasIngredientCategory(product: Product, ...cats: IngredientCategory[]): boolean {
  return product.ingredientIds.some((id) => {
    const ing = ingredientById.get(id)
    return ing !== undefined && cats.some((c) => ing.category.includes(c))
  })
}

/**
 * Rinse-off products don't count toward leave-on functional steps — the
 * glycerin in a cleanser or the niacinamide in a wash-off mask spends
 * seconds on skin, not hours.
 */
function isLeaveOn(product: Product): boolean {
  return product.category !== 'cleanser' && product.category !== 'mask'
}

export interface ChecklistItem {
  id: string
  label: string
  /**
   * Advisory, not prescriptive (spec Phase 4): phrased as "your routine
   * doesn't include X", never "you must buy X".
   */
  missingMessage: string
  appliesTo: RoutineTime[]
  isSatisfiedBy: (product: Product) => boolean
}

export const CHECKLIST: ChecklistItem[] = [
  {
    id: 'cleanser',
    label: 'Cleanser',
    missingMessage:
      "Your routine doesn't include a cleanser. (Skipping it in the AM is a valid choice for some skin — a water rinse can be enough.)",
    appliesTo: ['AM', 'PM'],
    isSatisfiedBy: (p) => p.category === 'cleanser',
  },
  {
    id: 'hydrator',
    label: 'Hydrating step',
    missingMessage:
      "Your routine doesn't include a humectant-based hydrating step (hyaluronic acid, glycerin, and similar).",
    appliesTo: ['AM'],
    isSatisfiedBy: (p) => isLeaveOn(p) && hasIngredientCategory(p, 'humectant'),
  },
  {
    id: 'antioxidant',
    label: 'Antioxidant / treatment',
    missingMessage:
      "Your AM routine doesn't include an antioxidant (like vitamin C) or treatment step. Antioxidants complement sunscreen during the day.",
    appliesTo: ['AM'],
    isSatisfiedBy: (p) =>
      p.category === 'treatment' ||
      (isLeaveOn(p) && hasIngredientCategory(p, 'antioxidant', 'vitamin-c')),
  },
  {
    id: 'treatment',
    label: 'Treatment / active',
    missingMessage:
      "Your PM routine doesn't include a treatment step (retinoid, exfoliant, or other active). That's fine if your goal is maintenance — it depends on what you're trying to address.",
    appliesTo: ['PM'],
    isSatisfiedBy: (p) =>
      p.category === 'treatment' ||
      (isLeaveOn(p) &&
        hasIngredientCategory(
          p,
          'retinoid',
          'exfoliant-chemical',
          'vitamin-c',
          'peptide',
          'acne-treatment',
        )),
  },
  {
    id: 'moisturizer',
    label: 'Moisturizer',
    missingMessage: "Your routine doesn't include a moisturizer.",
    appliesTo: ['AM', 'PM'],
    isSatisfiedBy: (p) => p.category === 'moisturizer',
  },
  {
    id: 'spf',
    label: 'SPF',
    missingMessage:
      "Your AM routine doesn't include an SPF product. Daily broad-spectrum sunscreen is the most evidence-backed protective step there is.",
    appliesTo: ['AM'],
    isSatisfiedBy: (p) => p.category === 'spf' || hasIngredientCategory(p, 'spf'),
  },
]

export interface CoverageResult {
  item: ChecklistItem
  satisfiedBy: Product[]
}

/** Compare one time-of-day column against its functional checklist. */
export function analyzeCoverage(products: Product[], time: RoutineTime): CoverageResult[] {
  return CHECKLIST.filter((item) => item.appliesTo.includes(time)).map((item) => ({
    item,
    satisfiedBy: products.filter((p) => item.isSatisfiedBy(p)),
  }))
}
