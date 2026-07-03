import { describe, expect, it } from 'vitest'
import { analyzeCoverage } from './gaps'
import { seedProducts } from './data'
import type { Product } from '../types'

const byId = new Map(seedProducts.map((p) => [p.id, p]))
const get = (id: string): Product => {
  const p = byId.get(id)
  if (!p) throw new Error(`missing seed product ${id}`)
  return p
}

const missingIds = (products: Product[], time: 'AM' | 'PM') =>
  analyzeCoverage(products, time)
    .filter((c) => c.satisfiedBy.length === 0)
    .map((c) => c.item.id)

describe('analyzeCoverage', () => {
  it('AM checklist is cleanser/hydrator/antioxidant/moisturizer/spf', () => {
    const items = analyzeCoverage([], 'AM').map((c) => c.item.id)
    expect(items).toEqual(['cleanser', 'hydrator', 'antioxidant', 'moisturizer', 'spf'])
  })

  it('PM checklist is cleanser/treatment/moisturizer', () => {
    const items = analyzeCoverage([], 'PM').map((c) => c.item.id)
    expect(items).toEqual(['cleanser', 'treatment', 'moisturizer'])
  })

  it('reports a complete AM routine as fully covered', () => {
    const products = [
      get('cerave-foaming-cleanser'),
      get('to-hyaluronic-b5'),
      get('timeless-vitc-e-ferulic'),
      get('cerave-pm-lotion'),
      get('eltamd-uv-clear-46'),
    ]
    expect(missingIds(products, 'AM')).toEqual([])
  })

  it('flags a missing SPF in an otherwise solid AM routine', () => {
    const products = [
      get('cerave-foaming-cleanser'),
      get('to-hyaluronic-b5'),
      get('cerave-pm-lotion'),
    ]
    expect(missingIds(products, 'AM')).toContain('spf')
  })

  it('counts a retinoid serum as the PM treatment step', () => {
    const products = [
      get('cerave-foaming-cleanser'),
      get('to-retinol-1-squalane'),
      get('cerave-moisturizing-cream'),
    ]
    expect(missingIds(products, 'PM')).toEqual([])
  })

  it('flags a PM routine with no active as missing a treatment', () => {
    const products = [get('cerave-hydrating-cleanser'), get('vanicream-moisturizing-cream')]
    expect(missingIds(products, 'PM')).toEqual(['treatment'])
  })

  it('does not let rinse-off products satisfy leave-on steps', () => {
    // Foaming cleanser contains glycerin (humectant) + niacinamide (antioxidant),
    // but it rinses off — it should only tick the cleanser box.
    const missing = missingIds([get('cerave-foaming-cleanser')], 'AM')
    expect(missing).toContain('hydrator')
    expect(missing).toContain('antioxidant')
    expect(missing).not.toContain('cleanser')
  })

  it('records which products satisfy each item', () => {
    const coverage = analyzeCoverage([get('eltamd-uv-clear-46')], 'AM')
    const spf = coverage.find((c) => c.item.id === 'spf')!
    expect(spf.satisfiedBy.map((p) => p.id)).toEqual(['eltamd-uv-clear-46'])
  })
})
