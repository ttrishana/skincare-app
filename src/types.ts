export type IngredientCategory =
  | 'cleanser-surfactant'
  | 'exfoliant-chemical'
  | 'exfoliant-physical'
  | 'retinoid'
  | 'vitamin-c'
  | 'peptide'
  | 'antioxidant'
  | 'humectant'
  | 'occlusive'
  | 'emollient'
  | 'spf'
  | 'acne-treatment'
  | 'fragrance'
  | 'other'

export interface Ingredient {
  id: string // slug, e.g. "niacinamide"
  inciName: string
  commonName: string
  category: IngredientCategory[]
  functions: string[]
  phSensitive: boolean
  notes?: string
}

export type ConflictSeverity =
  | 'avoid-same-routine'
  | 'space-out'
  | 'monitor-irritation'

/**
 * ingredientA/ingredientB are either an ingredient id (e.g. "retinol") or a
 * category reference written as "category:<IngredientCategory>"
 * (e.g. "category:exfoliant-chemical"). When both an id-level and a
 * category-level rule match the same pair, the more severe rule wins.
 */
export interface ConflictRule {
  id: string
  ingredientA: string
  ingredientB: string
  severity: ConflictSeverity
  reason: string
  recommendation: string
}

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'spf'
  | 'treatment'
  | 'mask'

export interface Product {
  id: string
  brand: string
  name: string
  category: ProductCategory
  /**
   * References Ingredient.id, ordered by INCI concentration where known.
   * For seed products this is a verified key-ingredient mapping, not the
   * full INCI list — see data/README.md.
   */
  ingredientIds: string[]
  priceUSD?: number
  sizeMl?: number
  isCustom?: boolean
}

export interface RoutineSlot {
  productId: string
  timeOfDay: 'AM' | 'PM' | 'both'
  order: number
}

export interface Routine {
  slots: RoutineSlot[]
}

/** A custom product also keeps the raw tokens that didn't match any known ingredient. */
export interface CustomProduct extends Product {
  isCustom: true
  unmatchedTokens: string[]
}
