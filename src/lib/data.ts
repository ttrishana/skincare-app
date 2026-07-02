import ingredientsJson from '../data/ingredients.json'
import productsJson from '../data/products.json'
import conflictRulesJson from '../data/conflict-rules.json'
import type { ConflictRule, Ingredient, Product } from '../types'

export const ingredients = ingredientsJson as unknown as Ingredient[]
export const seedProducts = productsJson as unknown as Product[]
export const conflictRules = conflictRulesJson as unknown as ConflictRule[]

export const ingredientById = new Map(ingredients.map((i) => [i.id, i]))
