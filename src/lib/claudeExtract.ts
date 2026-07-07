import Anthropic from '@anthropic-ai/sdk'
import { ingredients, ingredientById } from './data'

/**
 * LLM-assisted structured extraction (spec Phase 6): parse a messy pasted
 * ingredient blob into structured matches using the Claude API, as a
 * fallback/complement to the local fuzzy matcher.
 *
 * Runs directly from the browser with a user-supplied API key (this is a
 * local single-user tool — the key never leaves the user's machine except
 * to call Anthropic). The key is kept in localStorage.
 */

const API_KEY_STORAGE = 'skincare-app.anthropicApiKey.v1'

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function saveApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_STORAGE, key)
  else localStorage.removeItem(API_KEY_STORAGE)
}

export interface ExtractedIngredient {
  /** The ingredient text as it appeared in the blob. */
  raw: string
  /** Canonical Ingredient.id, or null if Claude couldn't map it. */
  ingredientId: string | null
  /** Claude's self-reported mapping confidence in [0, 1]. */
  confidence: number
}

const OUTPUT_SCHEMA = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ingredients'],
    properties: {
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['raw', 'ingredientId', 'confidence'],
          properties: {
            raw: {
              type: 'string',
              description: 'One ingredient exactly as written in the pasted text',
            },
            ingredientId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description:
                'The canonical ingredient id from the provided list, or null if no listed ingredient is a plausible match',
            },
            confidence: {
              type: 'number',
              description:
                'Mapping confidence between 0 and 1. Use 1 only for unambiguous INCI matches; below 0.6 for guesses.',
            },
          },
        },
      },
    },
  },
}

function systemPrompt(): string {
  const catalog = ingredients
    .map((i) => `${i.id}\t${i.inciName}\t${i.commonName}`)
    .join('\n')
  return `You map skincare ingredient labels to a fixed catalog of canonical ingredient ids.

The user pastes the text of a product's ingredient list — possibly messy: OCR artifacts, marketing copy mixed in, percentages, non-comma separators, translations. Extract each individual ingredient and map it to the catalog below. Never invent ids that are not in the catalog. If an ingredient is real but not in the catalog, return ingredientId null. Ignore non-ingredient text (headings like "Ingredients:", marketing claims, "may contain" markers are kept as their listed ingredients).

Catalog (id, INCI name, common name):
${catalog}`
}

/**
 * Parse a messy ingredient blob with Claude. Throws Anthropic API errors
 * (AuthenticationError, RateLimitError, ...) for the caller to surface.
 */
export async function extractWithClaude(
  blob: string,
  apiKey: string,
): Promise<ExtractedIngredient[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    system: systemPrompt(),
    output_config: { format: OUTPUT_SCHEMA },
    messages: [{ role: 'user', content: blob }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? '{"ingredients":[]}'
  const parsed = JSON.parse(text) as { ingredients: ExtractedIngredient[] }

  // Guardrail: never trust ids the model invented — unknown ids become null.
  return parsed.ingredients.map((e) => ({
    raw: e.raw,
    ingredientId:
      e.ingredientId !== null && ingredientById.has(e.ingredientId) ? e.ingredientId : null,
    confidence: Math.max(0, Math.min(1, e.confidence)),
  }))
}

export function describeClaudeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'Invalid API key — check it in the field above.'
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the Claude API — wait a moment and try again.'
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the Claude API — check your connection.'
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error (${error.status}): ${error.message}`
  }
  return 'Unexpected error while parsing with Claude.'
}
