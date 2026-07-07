"""Evaluation template for the ingredient matcher — analysis by Trishana.

This file deliberately contains NO computed statistics. It loads the
predictions and hands you clean data structures; every metric is a
`TODO(me)` stub (spec §8 / §9: the labeling, computation, and
interpretation are the learning exercise, not Claude Code's job).

Workflow:
    1. Hand-label ~100-150 pairs in data/eval/labeled_pairs.json
    2. npm run eval:predict          -> writes eval/predictions.json
    3. Work through the stubs below in order (or copy them into a notebook)

A note on costs before you start (worth reasoning about in your write-up):
a FALSE MATCH (predicted id != true id, both non-null, accepted) silently
mislabels a product and can produce wrong conflict warnings downstream.
A FALSE "NO MATCH" just asks the user to tag the ingredient manually.
So precision and recall are NOT equally costly here — keep that in mind
when you pick a threshold in step 4.
"""

import json
from pathlib import Path

PREDICTIONS_PATH = Path(__file__).parent / "predictions.json"


def load_predictions() -> list[dict]:
    """Each row: raw, trueIngredientId, predictedId, confidence, method."""
    with open(PREDICTIONS_PATH) as f:
        return json.load(f)


def apply_threshold(rows: list[dict], threshold: float) -> list[dict]:
    """Predictions below `threshold` are treated as 'no match' (predictedId=None).

    This mirrors the app: matches under the auto-accept threshold are not
    silently applied. Returns new rows; does not mutate the input.
    """
    out = []
    for row in rows:
        r = dict(row)
        if r["confidence"] < threshold:
            r["predictedId"] = None
        out.append(r)
    return out


def precision_recall_f1(rows: list[dict], threshold: float) -> dict:
    """Step 2: compute precision, recall, and F1 at a given threshold.

    Decide (and write down!) how you define a positive here — the standard
    framing for this problem:
      TP: predicted id == true id (both non-null)
      FP: predicted a non-null id that's wrong (true id differs OR is null)
      FN: predicted null but the true id is non-null

    Note what happens to pairs where both are null — they don't appear in
    any of the three counts. Is that the right call? Say why in your notes.
    """
    # TODO(me): compute this (by hand or with sklearn — but know what each
    # number means for this problem before reaching for sklearn)
    raise NotImplementedError("TODO(me): precision/recall/F1")


def bootstrap_ci(rows: list[dict], threshold: float, metric: str,
                 n_resamples: int = 1000) -> tuple[float, float]:
    """Step 3: bootstrap a 95% CI around a metric estimate.

    ~100-150 labeled examples is a small sample; the point estimate alone
    is not trustworthy. Resample the ROWS with replacement (same size as
    the original), recompute the metric on each resample, repeat
    `n_resamples` times, and take the 2.5th / 97.5th percentiles.
    """
    # TODO(me): compute this — this is the hands-on bootstrapping exercise
    raise NotImplementedError("TODO(me): bootstrap confidence interval")


def threshold_sweep(rows: list[dict],
                    thresholds: list[float] | None = None) -> list[dict]:
    """Step 4: precision & recall as a function of the accept threshold.

    Sweep thresholds (e.g. 0.5 to 1.0 in steps of 0.05), compute
    precision/recall at each, and plot both curves. Then PICK a threshold
    and write a paragraph defending it — remember the cost asymmetry in
    the module docstring. Feed the winner back into
    src/lib/fuzzyMatch.ts (AUTO_ACCEPT_THRESHOLD).
    """
    # TODO(me): compute this and plot it (matplotlib is fine)
    raise NotImplementedError("TODO(me): threshold sweep")


def mcnemar_test(rows_method_a: list[dict], rows_method_b: list[dict]) -> float:
    """Step 5 (stretch): are two matchers SIGNIFICANTLY different?

    Compare per-example correctness of two methods on the SAME labeled set
    (e.g. exact-only vs exact+fuzzy, or fuzzy vs Claude extraction).
    McNemar's test uses only the discordant pairs — the examples where
    exactly one method is right. Look up the exact binomial version given
    the small sample, rather than the chi-squared approximation.
    """
    # TODO(me): compute this if you get to the stretch goal
    raise NotImplementedError("TODO(me): McNemar's test")


if __name__ == "__main__":
    rows = load_predictions()
    methods = {}
    for r in rows:
        methods[r["method"]] = methods.get(r["method"], 0) + 1
    print(f"Loaded {len(rows)} predictions from {PREDICTIONS_PATH.name}")
    print(f"By method: {methods}")
    print("\nEverything else is yours to compute — start with precision_recall_f1().")
