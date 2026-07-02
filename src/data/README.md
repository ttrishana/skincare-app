# Seed Data Notes

## ingredients.json
~150 common skincare actives and bases. `id` is the canonical slug referenced
everywhere else. `category` uses the `IngredientCategory` union in
`src/types.ts`; an ingredient can belong to several.

## conflict-rules.json
`ingredientA` / `ingredientB` are either an ingredient id (`"retinol"`) or a
category reference written as `"category:exfoliant-chemical"`. Rules are
symmetric (A/B order doesn't matter). Where an id-level rule overlaps a
category-level rule (e.g. `tretinoin-x-benzoyl-peroxide` inside
`retinoid-x-benzoyl-peroxide`), the compatibility engine (Phase 3) should
report only the most severe match per ingredient pair.

Severity meanings:
- `avoid-same-routine` — documented chemical deactivation/interaction
- `space-out` — no deactivation, but well-established irritation stacking
- `monitor-irritation` — tolerance-dependent, theoretical, or disputed;
  the reason field says which

**These rules are pending review — sanity-check the dermatological claims
before shipping (see spec §4).**

## products.json
Well-known real products. `ingredientIds` is a **verified key-ingredient
mapping, not the full INCI list** — it covers the headline actives and
notable base/marker ingredients (fragrance, drying alcohols, etc.) that the
conflict and gap engines need. Full INCI lists were deliberately not
reproduced from memory to avoid fabricating product data (spec §9). Prices
are approximate US retail as of mid-2026 and only feed the redundancy/spend
estimates.
