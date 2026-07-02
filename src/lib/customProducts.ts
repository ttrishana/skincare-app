import type { CustomProduct } from '../types'

const STORAGE_KEY = 'skincare-app.customProducts.v1'

export function loadCustomProducts(): CustomProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomProducts(products: CustomProduct[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export function makeCustomProductId(brand: string, name: string): string {
  const slug = `${brand} ${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `custom-${slug}-${Date.now().toString(36)}`
}
