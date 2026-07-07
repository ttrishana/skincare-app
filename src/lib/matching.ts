import { ingredientById, ingredients } from './data'
import {
  AUTO_ACCEPT_THRESHOLD,
  matchIngredientFuzzy,
  nameVariants,
} from './fuzzyMatch'
import type { Ingredient } from '../types'

/**
 * Matching pipeline (Phase 6):
 *  1. normalized exact match (INCI name, common name, id, synonyms) → confidence 1
 *  2. fuzzy match (trigram TF-IDF + edit distance, see fuzzyMatch.ts) →
 *     confidence in [REVIEW_THRESHOLD, 1); scores below REVIEW_THRESHOLD
 *     are treated as no match
 */

// Frequent label spellings that don't appear verbatim in ingredients.json
const SYNONYMS: Record<string, string> = {
  'water': 'water',
  'aqua': 'water',
  'eau': 'water',
  'purified water': 'water',
  'vitamin e': 'tocopherol',
  'vitamin c': 'ascorbic-acid',
  'l ascorbic acid': 'ascorbic-acid',
  'dl panthenol': 'panthenol',
  'd panthenol': 'panthenol',
  'provitamin b5': 'panthenol',
  'petroleum jelly': 'petrolatum',
  'white petrolatum': 'petrolatum',
  'fragrance': 'fragrance',
  'perfume': 'fragrance',
  'parfum fragrance': 'fragrance',
  'hyaluronan': 'hyaluronic-acid',
  'ha': 'hyaluronic-acid',
  'niacinamide vitamin b3': 'niacinamide',
  'nicotinamide': 'niacinamide',
  'ghk cu': 'copper-peptides',
  'copper tripeptide 1': 'copper-peptides',
  'bp': 'benzoyl-peroxide',
  'denatured alcohol': 'alcohol-denat',
  'sd alcohol 40': 'alcohol-denat',
  'sd alcohol 40 b': 'alcohol-denat',
  'ethanol': 'alcohol-denat',
}

const lookup = new Map<string, Ingredient>()
for (const ing of ingredients) {
  for (const name of [ing.inciName, ing.commonName, ing.id.replace(/-/g, ' ')]) {
    for (const v of nameVariants(name)) {
      if (!lookup.has(v)) lookup.set(v, ing)
    }
  }
}

export function matchIngredientName(raw: string): Ingredient | null {
  for (const v of nameVariants(raw)) {
    const direct = lookup.get(v)
    if (direct) return direct
    const syn = SYNONYMS[v]
    if (syn) return ingredientById.get(syn) ?? null
  }
  return null
}

export type MatchMethod = 'exact' | 'fuzzy' | 'none'

export interface TokenMatch {
  token: string
  ingredient: Ingredient | null
  /** 1 for exact matches, hybrid score for fuzzy, 0 for no match. */
  confidence: number
  method: MatchMethod
  /** True when the match should be shown to the user for confirmation. */
  needsConfirmation: boolean
}

/** Match a single raw ingredient string through the full pipeline. */
export function matchToken(token: string): TokenMatch {
  const exact = matchIngredientName(token)
  if (exact) {
    return { token, ingredient: exact, confidence: 1, method: 'exact', needsConfirmation: false }
  }
  const fuzzy = matchIngredientFuzzy(token)
  if (fuzzy) {
    return {
      token,
      ingredient: fuzzy.ingredient,
      confidence: fuzzy.confidence,
      method: 'fuzzy',
      needsConfirmation: fuzzy.confidence < AUTO_ACCEPT_THRESHOLD,
    }
  }
  return { token, ingredient: null, confidence: 0, method: 'none', needsConfirmation: false }
}

/** Split a pasted INCI list on commas/newlines/bullets and match each token. */
export function matchInciList(raw: string): TokenMatch[] {
  return raw
    .split(/[,;\n·•|]+/)
    .map((t) => t.replace(/\.\s*$/, '').trim())
    .filter(Boolean)
    .map(matchToken)
}
