import { describe, expect, it } from 'vitest'
import {
  AUTO_ACCEPT_THRESHOLD,
  matchIngredientFuzzy,
  REVIEW_THRESHOLD,
} from './fuzzyMatch'
import { matchInciList, matchToken } from './matching'

describe('matchIngredientFuzzy', () => {
  it('matches a simple typo with high confidence', () => {
    const m = matchIngredientFuzzy('niacinimide')
    expect(m?.ingredient.id).toBe('niacinamide')
    expect(m!.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_THRESHOLD)
  })

  it('matches word-order and extra-token noise', () => {
    const m = matchIngredientFuzzy('hyaluronate sodium')
    expect(m?.ingredient.id).toBe('sodium-hyaluronate')
  })

  it('matches a suffixed variant to the base ingredient', () => {
    const m = matchIngredientFuzzy('Sodium Hyaluronate Crosspolymer')
    expect(m?.ingredient.id).toBe('sodium-hyaluronate')
  })

  it('returns null for text nothing like any ingredient', () => {
    expect(matchIngredientFuzzy('xyzzy plugh quux')).toBeNull()
  })

  it('never returns a match below the floor', () => {
    const m = matchIngredientFuzzy('extract', 0.9)
    expect(m).toBeNull()
  })

  it('reports which candidate name matched, for inspectability', () => {
    const m = matchIngredientFuzzy('glicolic acid')
    expect(m?.ingredient.id).toBe('glycolic-acid')
    expect(typeof m?.matchedName).toBe('string')
  })
})

describe('matchToken pipeline', () => {
  it('prefers exact matches with confidence 1', () => {
    const m = matchToken('Niacinamide')
    expect(m.method).toBe('exact')
    expect(m.confidence).toBe(1)
    expect(m.needsConfirmation).toBe(false)
  })

  it('uses synonyms as exact matches', () => {
    const m = matchToken('Aqua')
    expect(m.ingredient?.id).toBe('water')
    expect(m.method).toBe('exact')
  })

  it('falls back to fuzzy with a confidence below 1', () => {
    const m = matchToken('niacinimide 10%')
    expect(m.method).toBe('fuzzy')
    expect(m.ingredient?.id).toBe('niacinamide')
    expect(m.confidence).toBeLessThan(1)
    expect(m.confidence).toBeGreaterThanOrEqual(REVIEW_THRESHOLD)
  })

  it('flags mid-confidence fuzzy matches for confirmation', () => {
    const results = matchInciList('Aqua, niacinimide, Unobtainium Extract')
    const methods = results.map((r) => r.method)
    expect(methods[0]).toBe('exact')
    expect(methods[1]).toBe('fuzzy')
    expect(methods[2]).toBe('none')
    for (const r of results) {
      if (r.method === 'fuzzy' && r.confidence < AUTO_ACCEPT_THRESHOLD) {
        expect(r.needsConfirmation).toBe(true)
      }
    }
  })

  it('returns none with zero confidence when nothing matches', () => {
    const m = matchToken('completely made up thing 123')
    expect(m.ingredient).toBeNull()
    expect(m.confidence).toBe(0)
    expect(m.method).toBe('none')
  })
})
