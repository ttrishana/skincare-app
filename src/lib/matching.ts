import { ingredientById, ingredients } from './data'
import type { Ingredient } from '../types'

/**
 * Phase 1 matcher: normalized exact matching against INCI names, common
 * names, ids, and a small synonym table. Phase 6 replaces this with a
 * fuzzy/embedding matcher that returns confidence scores.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "Water (Aqua)" → ["water aqua", "water", "aqua"] */
function variants(name: string): string[] {
  const out = [normalize(name)]
  const outside = name.replace(/\([^)]*\)/g, ' ')
  const inside = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1])
  for (const v of [outside, ...inside]) {
    const n = normalize(v)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

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
    for (const v of variants(name)) {
      if (!lookup.has(v)) lookup.set(v, ing)
    }
  }
}

export function matchIngredientName(raw: string): Ingredient | null {
  for (const v of variants(raw)) {
    const direct = lookup.get(v)
    if (direct) return direct
    const syn = SYNONYMS[v]
    if (syn) return ingredientById.get(syn) ?? null
  }
  return null
}

export interface TokenMatch {
  token: string
  ingredient: Ingredient | null
}

/** Split a pasted INCI list on commas/newlines/bullets and match each token. */
export function matchInciList(raw: string): TokenMatch[] {
  return raw
    .split(/[,;\n·•|]+/)
    .map((t) => t.replace(/\.\s*$/, '').trim())
    .filter(Boolean)
    .map((token) => ({ token, ingredient: matchIngredientName(token) }))
}
