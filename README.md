# Skincare Routine Optimizer

Web app for building an AM/PM skincare routine, checking products for
ingredient conflicts, spotting coverage gaps, and finding redundant spending.
Full build spec: [docs/spec.md](docs/spec.md).

**Not medical advice** — educational/organizational tool only.

## Run

```sh
npm install
npm run dev
```

Requires Node 20. (Vite is pinned to v6 because Vite 8 needs Node 20.19+.)

## Status

- [x] **Phase 1** — data layer (types + seed JSON), product search/browse,
      "add custom product" flow with INCI-list matching
- [ ] Phase 2 — routine builder (AM/PM slots, drag-to-reorder, localStorage)
- [ ] Phase 3 — compatibility engine (pairwise conflict checks, layering order)
- [ ] Phase 4 — gap analysis
- [ ] Phase 5 — redundancy & spend optimizer
- [ ] Phase 6 — fuzzy ingredient matching + eval scaffolding (stats analysis
      done by hand, per spec §8)
- [ ] Phase 7 — dashboard/polish

> **Seed data pending review** — `src/data/conflict-rules.json` needs a
> sanity-check of the dermatological claims before the compatibility engine
> is built on top of it (spec §4). See `src/data/README.md` for data
> conventions and caveats.

## Layout

- `src/types.ts` — Ingredient, ConflictRule, Product, Routine models
- `src/data/` — seed JSON (154 ingredients, 31 conflict rules, 42 products)
- `src/lib/matching.ts` — normalized exact INCI matching (Phase 6 replaces
  this with a confidence-scored fuzzy matcher)
- `src/lib/customProducts.ts` — localStorage persistence for user products
- `src/components/` — product library UI
