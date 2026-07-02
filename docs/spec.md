# Skincare Routine Optimizer — Claude Code Build Spec

Paste this into Claude Code as your starting prompt. It's organized as phases so you (or Claude Code) can build and test incrementally instead of trying to generate the whole app in one shot.

---

## 1. Product Vision

Build a web app that helps users build a skincare routine (AM/PM), checks their
products for ingredient conflicts, flags gaps in routine coverage, and identifies
redundant/unnecessary spending.

**Non-goals for MVP:** no barcode scanning, no OCR, no user accounts/auth, no
scraping live retailer data, no mobile app. Keep it a single-user, local-storage,
browser-based tool first. Auth and a real backend can come later.

---

## 2. Tech Stack (recommended)

- **Frontend:** React + Vite + Tailwind CSS
- **State/persistence:** browser localStorage (no backend needed for MVP)
- **Data layer:** static JSON files bundled with the app (ingredients.json,
  products.json, conflict-rules.json) — swappable for a real DB later
- **Language:** TypeScript, for the data-modeling safety this project needs

Do not reach for a backend/database/auth system for v1. The entire compatibility
and gap logic can run client-side against static JSON.

---

## 3. Data Model

### 3.1 Ingredient
```ts
interface Ingredient {
  id: string;              // slug, e.g. "niacinamide"
  inciName: string;
  commonName: string;
  category: IngredientCategory[]; // e.g. ["exfoliant-chemical", "antioxidant"]
  functions: string[];     // e.g. ["brightening", "barrier-support"]
  phSensitive: boolean;
  notes?: string;
}

type IngredientCategory =
  | "cleanser-surfactant" | "exfoliant-chemical" | "exfoliant-physical"
  | "retinoid" | "vitamin-c" | "peptide" | "antioxidant"
  | "humectant" | "occlusive" | "emollient" | "spf" | "acne-treatment"
  | "fragrance" | "other";
```

### 3.2 Conflict Rule
```ts
interface ConflictRule {
  id: string;
  ingredientA: string;   // ingredient id or category
  ingredientB: string;
  severity: "avoid-same-routine" | "space-out" | "monitor-irritation";
  reason: string;        // short human-readable explanation
  recommendation: string; // e.g. "Use vitamin C in AM, retinoid in PM"
}
```

### 3.3 Product
```ts
interface Product {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory; // cleanser, toner, serum, moisturizer, spf, treatment, mask
  ingredientIds: string[];   // references Ingredient.id, ordered by INCI concentration if known
  priceUSD?: number;
  sizeMl?: number;
  isCustom?: boolean;        // true if user pasted their own ingredient list
}
```

### 3.4 Routine
```ts
interface RoutineSlot {
  productId: string;
  timeOfDay: "AM" | "PM" | "both";
  order: number; // layering order within that time of day
}

interface Routine {
  slots: RoutineSlot[];
}
```

---

## 4. Seed Data Requirements

Before writing UI code, generate the seed datasets:

- **ingredients.json**: ~150-250 common skincare actives and bases (retinoids,
  AHAs/BHAs, vitamin C forms, niacinamide, peptides, hyaluronic acid, ceramides,
  common humectants/occlusives, common SPF filters, common fragrance markers).
- **conflict-rules.json**: ~30-50 well-established conflict/caution pairs. Favor
  well-documented interactions (e.g. retinoid + chemical exfoliant same session,
  benzoyl peroxide deactivating retinol, high-dose vitamin C + direct acids
  irritation risk) over speculative ones. Where the skincare community disagrees
  (e.g. vitamin C + niacinamide), mark severity as "monitor-irritation" not
  "avoid," and say so in the reason field.
- **products.json**: ~50-100 well-known real products with real INCI lists, across
  cleanser/toner/serum/moisturizer/SPF categories, to make the demo feel real.

Ask me to review the conflict-rules.json before wiring it into the app — I want
to sanity-check the dermatological claims before they ship.

---

## 5. Core Features (build in this order)

### Phase 1 — Data layer + product search
- Load ingredients.json/products.json/conflict-rules.json
- Product search/browse UI (search by name/brand, filter by category)
- "Add custom product" flow: user pastes a comma-separated INCI list, app
  matches known ingredients and flags unmatched ones for manual tagging

### Phase 2 — Routine builder
- AM and PM routine slots, drag-to-reorder within each
- Add products from search or custom entry into a slot
- Persist routine to localStorage

### Phase 3 — Compatibility engine
- For every pair of products active in the same time-of-day routine, check
  ingredient pairs against conflict-rules.json
- Render conflicts as a severity-coded list (red = avoid same routine,
  yellow = space out, gray = monitor) with plain-language explanation and
  recommendation
- Layering order check: warn if routine order violates general
  thinnest-to-thickest / pH-dependent sequencing guidance

### Phase 4 — Gap analysis
- Define a "functional checklist" per time of day (AM: cleanser, hydrator,
  antioxidant/treatment, moisturizer, SPF — PM: cleanser, treatment,
  moisturizer)
- Compare routine against checklist, list missing functional categories
- Keep this advisory, not prescriptive — phrase as "your routine doesn't
  include an SPF product" not "you must buy X"

### Phase 5 — Redundancy & spend optimizer
- Detect products sharing a primary function/category (e.g. two chemical
  exfoliants, three vitamin-C serums)
- Show estimated $ tied up in redundant products (using Product.priceUSD)
- Suggest which one to consider dropping based on simplicity (not brand
  promotion — just "these two products serve the same role")

### Phase 6 — ML/NLP layer (differentiation for resume)

Goal: move past pure rule-matching into something that requires real modeling
and evaluation, while leaving the statistical analysis itself for me to do by
hand as a learning exercise (see Section 8).

- **Fuzzy ingredient matching**: replace exact-string matching in the
  "add custom product" flow with embedding-based similarity (e.g.
  sentence-transformers or a TF-IDF + edit-distance hybrid) to map messy,
  free-text ingredient names to canonical ingredient IDs. Return a confidence
  score per match, not just a binary match/no-match.
- **Labeled evaluation set**: scaffold a `data/eval/labeled_pairs.json` file
  and a small script/notebook template (`eval/evaluate_matching.py` or a
  Jupyter notebook) that loads predictions vs. ground truth and leaves the
  actual metric computation as `# TODO(me): compute this` stubs — do not fill
  in the statistics yourself. I will hand-label ~100-150 examples and write
  the analysis.
- **LLM-assisted structured extraction**: use the Claude API to parse a
  pasted, messy ingredient blob into structured JSON (ingredient, confidence,
  unmatched flag) as a fallback/complement to the embedding matcher.
- Wire the matcher's confidence score into the UI so low-confidence matches
  are visibly flagged for the user to confirm manually.

### Phase 7 — Polish
- Dashboard view: routine at a glance + conflict count + gap count + estimated
  redundant spend, all in one screen
- Empty states, mobile-responsive layout
- Basic onboarding: skin type + concerns (optional, used only to prioritize
  which gaps to surface first — not for product recommendations in MVP)

---

## 8. Statistics You Do Yourself (learning goal, not delegated to Claude Code)

The point of Phase 6 is to give you a real, small dataset and a real modeling
decision to reason about statistically — not to have Claude Code hand you
finished numbers. Once the scaffolding exists, work through these yourself,
in a notebook separate from the app code:

1. **Hand-label the eval set.** For ~100-150 (raw ingredient text, true
   ingredient ID) pairs, some easy and some deliberately messy/ambiguous.
2. **Compute precision, recall, and F1** for the matcher at a given confidence
   threshold — by hand or with sklearn, but understand what each number means
   for this problem (a false match silently mislabels a product; a false
   "no match" just asks the user to confirm manually — so recall and
   precision aren't equally costly here, which is worth reasoning about).
3. **Bootstrap a confidence interval** around your precision/recall estimates,
   since 100-150 labeled examples is a small sample — resample with
   replacement, recompute the metric, repeat ~1000x, take the 2.5/97.5
   percentiles. This is a good first hands-on encounter with bootstrapping.
4. **Threshold sweep**: plot precision and recall against the confidence
   threshold you use to auto-accept a match vs. flag for manual confirmation,
   and pick a threshold with a stated rationale (this is a precision/recall
   tradeoff decision, worth writing a paragraph about).
5. **(Stretch) Compare two matching methods** (e.g. TF-IDF+edit-distance vs.
   embeddings) on the same labeled set using McNemar's test to check whether
   one is statistically significantly better, not just numerically higher.
6. Write up what you did and why in a short markdown notebook — this write-up
   is what turns into the resume-bullet numbers and interview talking points.

Ask me (Claude) for help understanding any of these statistical concepts as
you go, but do the labeling, computation, and interpretation yourself — that's
the part that actually builds the skill and that you can speak to in an
interview.

## 9. Explicit Guardrails for Claude Code

- Do not present this as medical or dermatological advice anywhere in the UI
  copy — include a small persistent disclaimer that this is educational/
  organizational, not a substitute for a dermatologist.
- Do not fabricate ingredient lists for real products — mark any uncertain
  product data clearly, or only ship products you can verify.
- Keep the compatibility engine's reasoning inspectable: every flagged
  conflict should show which two ingredients triggered it and why, not just
  a black-box warning.
- For Phase 6, only build the matcher, the data pipeline, and stubbed-out
  evaluation scaffolding. Do not compute precision/recall/confidence
  intervals or write the statistical analysis — leave that to me, per
  Section 8. If asked to "evaluate the matcher," confirm whether that means
  building the harness (yes) or doing the analysis (no, that's mine to do).

---

## 10. Suggested First Message to Claude Code

> Set up a new Vite + React + TypeScript + Tailwind project for a skincare
> routine app. Start with Phase 1 from the spec: define the Ingredient,
> Product, ConflictRule, and Routine types, generate seed ingredients.json
> (~150 ingredients) and conflict-rules.json (~30 rules) covering the most
> well-established skincare ingredient interactions, and build a basic
> product search/browse screen. Stop after Phase 1 so I can review the seed
> data before we build the routine builder.
