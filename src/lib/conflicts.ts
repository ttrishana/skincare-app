import { conflictRules, ingredientById } from './data'
import type {
  ConflictRule,
  ConflictSeverity,
  Ingredient,
  IngredientCategory,
  Product,
} from '../types'

export const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  'avoid-same-routine': 0,
  'space-out': 1,
  'monitor-irritation': 2,
}

/** One rule firing for one product pair, with every ingredient pair that triggered it. */
export interface ConflictFinding {
  rule: ConflictRule
  productA: Product
  productB: Product
  triggers: Array<{ a: Ingredient; b: Ingredient }>
}

function refMatches(ref: string, ing: Ingredient): boolean {
  if (ref.startsWith('category:')) {
    return ing.category.includes(ref.slice('category:'.length) as IngredientCategory)
  }
  return ref === ing.id
}

function ruleMatches(rule: ConflictRule, a: Ingredient, b: Ingredient): boolean {
  return (
    (refMatches(rule.ingredientA, a) && refMatches(rule.ingredientB, b)) ||
    (refMatches(rule.ingredientA, b) && refMatches(rule.ingredientB, a))
  )
}

/** Lower = more specific: id-level refs beat category-level refs on severity ties. */
function ruleGenerality(rule: ConflictRule): number {
  return (
    (rule.ingredientA.startsWith('category:') ? 1 : 0) +
    (rule.ingredientB.startsWith('category:') ? 1 : 0)
  )
}

function knownIngredients(product: Product): Ingredient[] {
  return product.ingredientIds
    .map((id) => ingredientById.get(id))
    .filter((i): i is Ingredient => i !== undefined)
}

/**
 * Check every pair of products (assumed active in the same time-of-day
 * routine) against the conflict rules. Ingredients within a single product
 * are never checked against each other — the formulator already balanced
 * them. For each triggering ingredient pair, only the most severe matching
 * rule is reported (id-level rules beat category-level rules on ties), then
 * findings are grouped per product pair and rule.
 */
export function findConflicts(products: Product[]): ConflictFinding[] {
  const findings: ConflictFinding[] = []

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const productA = products[i]
      const productB = products[j]
      const byRule = new Map<string, ConflictFinding>()

      for (const a of knownIngredients(productA)) {
        for (const b of knownIngredients(productB)) {
          const matching = conflictRules
            .filter((r) => ruleMatches(r, a, b))
            .sort(
              (r1, r2) =>
                SEVERITY_RANK[r1.severity] - SEVERITY_RANK[r2.severity] ||
                ruleGenerality(r1) - ruleGenerality(r2),
            )
          const best = matching[0]
          if (!best) continue
          const existing = byRule.get(best.id)
          if (existing) existing.triggers.push({ a, b })
          else byRule.set(best.id, { rule: best, productA, productB, triggers: [{ a, b }] })
        }
      }

      findings.push(...byRule.values())
    }
  }

  return findings.sort(
    (f1, f2) =>
      SEVERITY_RANK[f1.rule.severity] - SEVERITY_RANK[f2.rule.severity] ||
      f1.rule.id.localeCompare(f2.rule.id),
  )
}
