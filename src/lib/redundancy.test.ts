import { describe, expect, it } from 'vitest'
import { findRedundancies, totalPotentialSavings } from './redundancy'
import { seedProducts } from './data'
import type { Product } from '../types'

const byId = new Map(seedProducts.map((p) => [p.id, p]))
const get = (id: string): Product => {
  const p = byId.get(id)
  if (!p) throw new Error(`missing seed product ${id}`)
  return p
}

describe('findRedundancies', () => {
  it('groups two vitamin C serums and prices the overlap', () => {
    const groups = findRedundancies({
      AM: [get('skinceuticals-ce-ferulic'), get('timeless-vitc-e-ferulic')],
      PM: [],
    })
    const vitC = groups.find((g) => g.id === 'vitamin-c')
    expect(vitC).toBeDefined()
    expect(vitC!.products).toHaveLength(2)
    expect(vitC!.pricedTotal).toBeCloseTo(209)
    // keep the cheaper ($27) -> $182 tied up
    expect(vitC!.potentialSavings).toBeCloseTo(182)
  })

  it('counts a product used AM and PM once, not twice', () => {
    const p = get('timeless-vitc-e-ferulic')
    const groups = findRedundancies({ AM: [p], PM: [p] })
    expect(groups.find((g) => g.id === 'vitamin-c')).toBeUndefined()
  })

  it('groups chemical exfoliants across AM and PM', () => {
    const groups = findRedundancies({
      AM: [get('to-glycolic-toner')],
      PM: [get('pc-2-bha-liquid')],
    })
    const ex = groups.find((g) => g.id === 'chemical-exfoliant')
    expect(ex).toBeDefined()
    expect(ex!.products.map((p) => p.id).sort()).toEqual([
      'pc-2-bha-liquid',
      'to-glycolic-toner',
    ])
  })

  it('ignores rinse-off products for active roles', () => {
    // COSRX cleanser contains betaine salicylate but rinses off
    const groups = findRedundancies({
      AM: [get('cosrx-low-ph-cleanser'), get('pc-2-bha-liquid')],
      PM: [],
    })
    expect(groups.find((g) => g.id === 'chemical-exfoliant')).toBeUndefined()
  })

  it('flags two moisturizers in the same column but not across columns', () => {
    const sameColumn = findRedundancies({
      AM: [get('cerave-moisturizing-cream'), get('neutrogena-hydro-boost-gel')],
      PM: [],
    })
    expect(sameColumn.find((g) => g.id === 'moisturizer-AM')).toBeDefined()

    const acrossColumns = findRedundancies({
      AM: [get('neutrogena-hydro-boost-gel')],
      PM: [get('cerave-moisturizing-cream')],
    })
    expect(acrossColumns.filter((g) => g.id.startsWith('moisturizer'))).toHaveLength(0)
  })

  it('reports nothing for a varied routine', () => {
    const groups = findRedundancies({
      AM: [get('cerave-foaming-cleanser'), get('timeless-vitc-e-ferulic'), get('eltamd-uv-clear-46')],
      PM: [get('cerave-foaming-cleanser'), get('to-retinol-1-squalane'), get('cerave-pm-lotion')],
    })
    expect(groups).toHaveLength(0)
  })

  it('sums potential savings across groups', () => {
    const groups = findRedundancies({
      AM: [get('skinceuticals-ce-ferulic'), get('timeless-vitc-e-ferulic')],
      PM: [get('to-glycolic-toner'), get('pc-2-bha-liquid')],
    })
    // vitamin C: 209 - 27 = 182; exfoliants: 48 - 13 = 35
    expect(totalPotentialSavings(groups)).toBeCloseTo(217)
  })
})
