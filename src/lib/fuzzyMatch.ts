import { ingredients } from './data'
import type { Ingredient } from '../types'

/**
 * Phase 6 fuzzy matcher: maps messy free-text ingredient names to canonical
 * ingredient ids with a confidence score in [0, 1].
 *
 * Method: hybrid of
 *  - TF-IDF-weighted character-trigram cosine similarity (robust to word
 *    reordering and partial tokens, e.g. "sodium hyaluronate solution"), and
 *  - normalized Levenshtein similarity (robust to typos, e.g. "niacinimide").
 *
 * This is deliberately not an embedding model — it's fast, dependency-free,
 * and fully inspectable, which matters more here than semantic generality.
 */

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "Water (Aqua)" → ["water aqua", "water", "aqua"] */
export function nameVariants(name: string): string[] {
  const out = [normalizeName(name)]
  const outside = name.replace(/\([^)]*\)/g, ' ')
  const inside = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1])
  for (const v of [outside, ...inside]) {
    const n = normalizeName(v)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

// ---------------------------------------------------------------------------
// Thresholds
//
// TODO(trishana): tune these after running your eval analysis (spec §8).
// The threshold sweep in eval/evaluate_matching.py is exactly the tool for
// picking these — remember the asymmetry: a false match silently mislabels
// a product, a false "no match" just asks the user to confirm.
// ---------------------------------------------------------------------------

/** At or above this, treat the match as confident (no user confirmation). */
export const AUTO_ACCEPT_THRESHOLD = 0.85
/** Between this and AUTO_ACCEPT, suggest the match but ask the user to confirm. */
export const REVIEW_THRESHOLD = 0.6

// The two signals cover disjoint failure modes: trigram cosine survives word
// reordering ("hyaluronate sodium", lev ≈ 0.22) and Levenshtein survives
// typos ("niacinimide", cosine ≈ 0.75). A weighted mean drags both cases
// down, so the hybrid takes the max — fragments and unrelated strings stay
// low on both signals, which is what the thresholds rely on.

// ---------------------------------------------------------------------------
// Trigram TF-IDF index over all candidate names
// ---------------------------------------------------------------------------

interface Candidate {
  ingredient: Ingredient
  name: string
  grams: Map<string, number> // trigram -> tf-idf weight
  norm: number
}

function trigrams(s: string): string[] {
  const padded = `  ${s} ` // padding weights word starts, where INCI names differ most
  const out: string[] = []
  for (let i = 0; i <= padded.length - 3; i++) out.push(padded.slice(i, i + 3))
  return out
}

function buildIndex(): { candidates: Candidate[]; inverted: Map<string, number[]> } {
  const rawCandidates: Array<{ ingredient: Ingredient; name: string; counts: Map<string, number> }> = []
  const docFreq = new Map<string, number>()

  for (const ing of ingredients) {
    const names = new Set<string>()
    for (const source of [ing.inciName, ing.commonName, ing.id.replace(/-/g, ' ')]) {
      for (const v of nameVariants(source)) names.add(v)
    }
    for (const name of names) {
      const counts = new Map<string, number>()
      for (const g of trigrams(name)) counts.set(g, (counts.get(g) ?? 0) + 1)
      for (const g of counts.keys()) docFreq.set(g, (docFreq.get(g) ?? 0) + 1)
      rawCandidates.push({ ingredient: ing, name, counts })
    }
  }

  const n = rawCandidates.length
  const idf = (g: string) => Math.log(1 + n / (docFreq.get(g) ?? 1))

  const candidates: Candidate[] = rawCandidates.map(({ ingredient, name, counts }) => {
    const grams = new Map<string, number>()
    let sq = 0
    for (const [g, c] of counts) {
      const w = c * idf(g)
      grams.set(g, w)
      sq += w * w
    }
    return { ingredient, name, grams, norm: Math.sqrt(sq) }
  })

  const inverted = new Map<string, number[]>()
  candidates.forEach((c, i) => {
    for (const g of c.grams.keys()) {
      const list = inverted.get(g)
      if (list) list.push(i)
      else inverted.set(g, [i])
    }
  })

  return { candidates, inverted }
}

const index = buildIndex()
const idfOf = new Map<string, number>()
{
  // reconstruct query-side idf from the built candidates (same weighting)
  const docFreq = new Map<string, number>()
  for (const c of index.candidates) {
    for (const g of c.grams.keys()) docFreq.set(g, (docFreq.get(g) ?? 0) + 1)
  }
  const n = index.candidates.length
  for (const [g, df] of docFreq) idfOf.set(g, Math.log(1 + n / df))
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 0 : 1 - levenshtein(a, b) / maxLen
}

function trigramCosine(queryGrams: Map<string, number>, queryNorm: number, c: Candidate): number {
  if (queryNorm === 0 || c.norm === 0) return 0
  let dot = 0
  for (const [g, w] of queryGrams) {
    const cw = c.grams.get(g)
    if (cw) dot += w * cw
  }
  return dot / (queryNorm * c.norm)
}

export interface FuzzyMatch {
  ingredient: Ingredient
  /** Hybrid score in [0, 1]; see thresholds above. */
  confidence: number
  /** Which candidate name variant produced the score (for inspectability). */
  matchedName: string
}

/**
 * Return the best-scoring candidate for a raw ingredient string, or null if
 * nothing clears `floor`. Always scores every variant of every shortlisted
 * ingredient and keeps the max.
 */
export function matchIngredientFuzzy(raw: string, floor = REVIEW_THRESHOLD): FuzzyMatch | null {
  const best = { score: 0, candidate: null as Candidate | null }

  for (const variant of nameVariants(raw)) {
    if (!variant) continue
    const counts = new Map<string, number>()
    for (const g of trigrams(variant)) counts.set(g, (counts.get(g) ?? 0) + 1)
    const queryGrams = new Map<string, number>()
    let sq = 0
    for (const [g, c] of counts) {
      const w = c * (idfOf.get(g) ?? 1)
      queryGrams.set(g, w)
      sq += w * w
    }
    const queryNorm = Math.sqrt(sq)

    // Shortlist: candidates sharing at least one trigram with the query
    const shortlist = new Set<number>()
    for (const g of queryGrams.keys()) {
      for (const i of index.inverted.get(g) ?? []) shortlist.add(i)
    }

    for (const i of shortlist) {
      const c = index.candidates[i]
      const score = Math.max(
        trigramCosine(queryGrams, queryNorm, c),
        levenshteinSimilarity(variant, c.name),
      )
      if (score > best.score) {
        best.score = score
        best.candidate = c
      }
    }
  }

  if (!best.candidate || best.score < floor) return null
  return {
    ingredient: best.candidate.ingredient,
    confidence: Math.min(1, best.score),
    matchedName: best.candidate.name,
  }
}
