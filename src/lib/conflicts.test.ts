import { describe, expect, it } from 'vitest'
import { findConflicts } from './conflicts'
import { checkLayering } from './layering'
import { seedProducts } from './data'
import type { Product } from '../types'

const byId = new Map(seedProducts.map((p) => [p.id, p]))
const get = (id: string): Product => {
  const p = byId.get(id)
  if (!p) throw new Error(`missing seed product ${id}`)
  return p
}

describe('findConflicts', () => {
  it('flags retinol + benzoyl peroxide as avoid-same-routine (id rule beats category rule)', () => {
    const findings = findConflicts([get('to-retinol-1-squalane'), get('lrp-effaclar-duo')])
    expect(findings).toHaveLength(1)
    expect(findings[0].rule.id).toBe('retinol-x-benzoyl-peroxide')
    expect(findings[0].rule.severity).toBe('avoid-same-routine')
    expect(findings[0].triggers).toEqual([
      expect.objectContaining({
        a: expect.objectContaining({ id: 'retinol' }),
        b: expect.objectContaining({ id: 'benzoyl-peroxide' }),
      }),
    ])
  })

  it('flags retinoid + chemical exfoliant via category rule', () => {
    const findings = findConflicts([get('to-retinol-1-squalane'), get('pc-2-bha-liquid')])
    const ids = findings.map((f) => f.rule.id)
    expect(ids).toContain('retinoid-x-chemical-exfoliant')
    const f = findings.find((x) => x.rule.id === 'retinoid-x-chemical-exfoliant')!
    expect(f.rule.severity).toBe('space-out')
    expect(f.triggers[0].a.id).toBe('retinol')
    expect(f.triggers[0].b.id).toBe('salicylic-acid')
  })

  it('groups multiple triggering ingredient pairs under one finding', () => {
    // Both products contain several direct acids -> many pairs, one rule
    const findings = findConflicts([get('to-aha-bha-peel'), get('de-tlc-framboos')])
    const acidStacking = findings.find((f) => f.rule.id === 'chemical-x-chemical-exfoliant')
    expect(acidStacking).toBeDefined()
    expect(acidStacking!.triggers.length).toBeGreaterThan(4)
    // still a single finding for the pair, not one per ingredient combination
    expect(
      findings.filter((f) => f.rule.id === 'chemical-x-chemical-exfoliant'),
    ).toHaveLength(1)
  })

  it('never flags ingredients within a single product', () => {
    // The peel alone contains AHA+BHA combinations that would match rules pairwise
    expect(findConflicts([get('to-aha-bha-peel')])).toHaveLength(0)
  })

  it('reports nothing for compatible products', () => {
    const findings = findConflicts([
      get('cerave-hydrating-cleanser'),
      get('to-hyaluronic-b5'),
      get('cerave-moisturizing-cream'),
    ])
    expect(findings).toHaveLength(0)
  })

  it('orders findings by severity', () => {
    const findings = findConflicts([
      get('to-retinol-1-squalane'), // retinol
      get('lrp-effaclar-duo'), // benzoyl peroxide -> avoid
      get('to-glycolic-toner'), // AHA -> space-out with retinol, monitor with BP
    ])
    const ranks = findings.map((f) => f.rule.severity)
    expect(ranks[0]).toBe('avoid-same-routine')
    expect([...ranks].sort()).toEqual([...ranks].sort()) // sanity
    for (let i = 1; i < findings.length; i++) {
      expect(
        ['avoid-same-routine', 'space-out', 'monitor-irritation'].indexOf(ranks[i]),
      ).toBeGreaterThanOrEqual(
        ['avoid-same-routine', 'space-out', 'monitor-irritation'].indexOf(ranks[i - 1]),
      )
    }
  })
})

describe('checkLayering', () => {
  it('accepts a canonical AM order', () => {
    const ordered = [
      get('cerave-hydrating-cleanser'),
      get('to-niacinamide'),
      get('cerave-pm-lotion'),
      get('eltamd-uv-clear-46'),
    ]
    expect(checkLayering(ordered)).toHaveLength(0)
  })

  it('warns when SPF is not last', () => {
    const warnings = checkLayering([get('eltamd-uv-clear-46'), get('cerave-pm-lotion')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toMatch(/last step/i)
  })

  it('warns when a cleanser comes after leave-on products', () => {
    const warnings = checkLayering([get('to-niacinamide'), get('cerave-hydrating-cleanser')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toMatch(/rinses off/i)
  })

  it('flags pH-dependent actives applied over moisturizer', () => {
    const warnings = checkLayering([get('cerave-moisturizing-cream'), get('to-glycolic-toner')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toMatch(/pH-dependent/i)
  })

  it('reports one warning per misplaced product, not one per inversion pair', () => {
    // toner last inverts against serum, moisturizer, and treatment — one warning
    const warnings = checkLayering([
      get('to-niacinamide'),
      get('cerave-pm-lotion'),
      get('to-glycolic-toner'),
    ])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].offender.id).toBe('to-glycolic-toner')
  })

  it('reports SPF-not-last once even with several products layered over it', () => {
    const warnings = checkLayering([
      get('eltamd-uv-clear-46'),
      get('to-niacinamide'),
      get('cerave-pm-lotion'),
    ])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toMatch(/last step/i)
  })
})
