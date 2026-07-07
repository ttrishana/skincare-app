# Matcher Evaluation — Trishana's Analysis Workspace

The app's fuzzy matcher (`src/lib/fuzzyMatch.ts`) returns a confidence score
per match. Whether its thresholds are any good is an empirical question, and
answering it is the Phase 6/§8 learning exercise — **the analysis in this
directory is done by hand, not by Claude Code.**

## Workflow

1. **Label** — fill `data/eval/labeled_pairs.json` with ~100-150
   `(raw text, true ingredient id)` pairs. Include easy ones, messy ones
   (typos, reordering, trade names, OCR junk), and true negatives
   (`trueIngredientId: null` for ingredients not in the catalog).
2. **Predict** — `npm run eval:predict` runs the real app pipeline over the
   labeled pairs and writes `eval/predictions.json`
   (`raw, trueIngredientId, predictedId, confidence, method`).
3. **Analyze** — work through the stubs in `evaluate_matching.py` (or copy
   them into a notebook):
   - precision / recall / F1 at the current threshold
   - bootstrap 95% CIs (small sample!)
   - threshold sweep → pick `AUTO_ACCEPT_THRESHOLD` with a written rationale
   - (stretch) McNemar's test comparing two matching methods
4. **Feed back** — update the thresholds in `src/lib/fuzzyMatch.ts` and
   write up what you did and why — that write-up is the resume material.

`eval/predictions.json` is regenerated output; don't hand-edit it.
