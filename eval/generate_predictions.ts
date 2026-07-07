/**
 * Runs the app's matching pipeline over data/eval/labeled_pairs.json and
 * writes eval/predictions.json for the statistical analysis (which is done
 * by hand in eval/evaluate_matching.py — this script only produces the
 * predictions, never the metrics).
 *
 * Usage: npm run eval:predict
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchToken } from '../src/lib/matching'

const here = dirname(fileURLToPath(import.meta.url))
const labeledPath = join(here, '..', 'data', 'eval', 'labeled_pairs.json')
const outPath = join(here, 'predictions.json')

interface LabeledPair {
  raw: string
  trueIngredientId: string | null
}

const { pairs } = JSON.parse(readFileSync(labeledPath, 'utf8')) as {
  pairs: LabeledPair[]
}

const predictions = pairs.map(({ raw, trueIngredientId }) => {
  const m = matchToken(raw)
  return {
    raw,
    trueIngredientId,
    predictedId: m.ingredient?.id ?? null,
    confidence: m.confidence,
    method: m.method,
  }
})

writeFileSync(outPath, JSON.stringify(predictions, null, 2) + '\n')

const counts = predictions.reduce<Record<string, number>>((acc, p) => {
  acc[p.method] = (acc[p.method] ?? 0) + 1
  return acc
}, {})
console.log(`Wrote ${predictions.length} predictions to eval/predictions.json`)
console.log('By method:', counts)
console.log('Next: analyze them yourself in eval/evaluate_matching.py (see spec §8).')
