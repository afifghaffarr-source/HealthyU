# Review — AI Warung Mode Spec

> **Reviewer:** Hermes (codebase verification)
> **Date:** 2026-06-22
> **Target:** `docs/features/ai-warung-mode-spec.md` (PR #27)
> **Status:** Spec needs revisions before Sprint W1

Spec is solid in vision but contains **3 critical inaccuracies** + **4 missed
opportunities** from not fully auditing the existing codebase. Verifications
done against `supabase/migrations/`, `src/features/scan/`, `src/hooks/`.

---

## 🔴 CRITICAL — spec is wrong (must fix)

### C1. Section 3.1 — `id_dish_reference` table DUPLICATES existing `food_items`

**Spec says:**

> New Supabase table: `id_dish_reference` with columns `canonical_name, aliases[],
category, default_portion_g, default_portion_label, calories_per_portion, ...`

**Reality:** `public.food_items` already exists (`supabase/migrations/20260603045312_0e7bc4a0-1bba-4cc6-94ae-78759fd59815.sql:25-43`)
with:

- `name`, `name_en`, `category`, `calories`, `protein_g`, `carbs_g`, `fat_g`,
  `fiber_g`, `serving_size`, `serving_unit`, `is_indonesian`, `created_at`
- **20 Indonesian foods already seeded** (Nasi Putih, Ayam Goreng, Rendang,
  Soto, Gado-Gado, etc. — exactly the warteg items spec wants)
- RLS policy: `food public read` — accessible to anon
- Indexed via `category`

**Fix:** Replace "new table `id_dish_reference`" with "**extend existing
`food_items`**":

```sql
ALTER TABLE public.food_items
  ADD COLUMN aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN portion_label TEXT,                    -- '1 piring', '1 centong', etc.
  ADD COLUMN source TEXT,                            -- 'TKPI' | 'OFF' | 'USDA' | 'manual'
  ADD COLUMN source_url TEXT,
  ADD COLUMN confidence_score NUMERIC DEFAULT 0.5;  -- 0-1, used by fuzzy match

-- GIN index for alias lookup (similar to spec's intent)
CREATE INDEX food_items_aliases_idx ON public.food_items USING gin (aliases);
```

**Sprint W1 effort drops from 3 hari → ~1 hari** (no table create, just
migration + 180 more seeds into existing table).

### C2. Section 8 — "Feature flag system" DOES NOT EXIST

**Spec says:**

> | Feature flag system | ✅ shipped (AUDIT-019 PII toggle uses it) |

**Reality:**

- Only `useOnboardingFlag` exists (`src/hooks/use-onboarding-flag.ts`) — it's
  a **"show once" UX helper** using `localStorage`, NOT a rollout percentage
  flag.
- AUDIT-019 (`docs/audit-019-pii-redaction-toggle.md`) uses a per-user boolean
  column `profiles.chat_redact_pii` — a **per-user preference toggle**, NOT
  a generic feature flag.

There is no percentage rollout system. Spec's "feature flag `feature.warung_mode`
default OFF, manual rollout 5% → 25% → 100%" cannot be implemented as
described.

**Fix options (pick one):**

| Option                                                                              | Effort | Trade-off                                              |
| ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| **A.** Per-user boolean column `profiles.warung_mode_enabled`                       | S      | Simple, but no A/B test, no instant kill switch        |
| **B.** Generic feature flag infra (`feature_flags` table + rollout % + kill switch) | M      | Reusable for future features; this audit invests in it |
| **C.** Hardcoded env var `WARUNG_MODE_ENABLED=true/false`                           | XS     | Trivial, no DB schema, no per-user opt-out             |
| **D.** localStorage flag in `useOnboardingFlag` pattern                             | XS     | Client-only, can't gate server-side endpoints          |

**Recommendation:** Option A for MVP (matches existing AUDIT-019 pattern).
Generic feature flag infra (B) is a separate, larger audit — defer to Fase 5
Production Hardening backlog.

### C3. Section 3.3 — AI prompt claims macros, but `MenuImageSchema` doesn't have them

**Spec says (in prompt):**

> Output kalori + makro per porsi standar (gunakan rujukan TKPI jika ragu)

**Reality:** `src/features/scan/lib/scanVision.functions.ts:72-83`:

```ts
const MenuImageSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().default(""),
        price: z.number().optional(),
        description: z.string().optional(),
        est_calories: z.number().optional(),
        // ← NO protein_g, carbs_g, fat_g, portion_g, category
      }),
    )
    .default([]),
});
```

**AI cannot return** protein_g/carbs_g/fat_g/portion_g/category without a
schema change. The Gemini call uses `callGeminiJson(..., MenuImageSchema, ...)`
which enforces strict validation — Gemini output is coerced to schema.

**Fix:** Schema upgrade in `scanVision.functions.ts`:

```ts
const MenuImageSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().default(""),
        price: z.number().optional(),
        description: z.string().optional(),
        est_calories: z.number().optional(),
        est_protein_g: z.number().optional(), // NEW
        est_carbs_g: z.number().optional(), // NEW
        est_fat_g: z.number().optional(), // NEW
        est_portion_g: z.number().optional(), // NEW (e.g. 150 for nasi)
        category: z
          .enum([
            // NEW
            "nasi",
            "lauk",
            "sayur",
            "sambal",
            "minuman",
            "pelengkap",
          ])
          .optional(),
      }),
    )
    .default([]),
});
```

**Note:** Gemini structured output quality degrades with more fields. With
6 optional fields per item, prompt needs explicit instruction that all
fields can be omitted if uncertain. Spec's prompt should reflect this.

---

## 🟡 MISSED OPPORTUNITIES (spec scope too narrow)

### M1. Spec ignores `food_serving_sizes` table

`supabase/migrations/20260603084749_39529d5e-7b4b-465d-94a9-ae51104c7e55.sql`
already has a `food_serving_sizes` table. Spec's portion templates (3.2)
should reference/integrate with this rather than creating a parallel
in-memory system.

**Action:** Verify if this table is populated + how it's used before
designing portion templates. If empty, populate alongside seeds.

### M2. Spec doesn't mention how AI prompt change affects OTHER scan routes

`parseMenuImage` is used by `/scan/menu` only. But the same Gemini prompt
pattern is used by:

- `parseRecipeImage` (different schema, different purpose)
- `recipeFromFridge` (different schema)

Changing `parseMenuImage` is safe. But spec should explicitly note "scope:
parseMenuImage only, do NOT touch other parse functions".

### M3. Spec's combo detection requires schema change to `meal_logs`

`public.meal_logs` schema (migration `20260603045312`):

```sql
CREATE TABLE public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id),
  custom_name TEXT,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  serving_qty NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC NOT NULL,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Spec says "tag combo via `combo_id` UUID" — **NO `combo_id` column exists**.

Spec also says "portion_adjusted flag" — **NO `portion_adjusted` column**.

**Fix:** Add migration:

```sql
ALTER TABLE public.meal_logs
  ADD COLUMN combo_id UUID,
  ADD COLUMN combo_name TEXT,
  ADD COLUMN portion_adjusted BOOLEAN DEFAULT FALSE,
  ADD COLUMN portion_g NUMERIC,
  ADD COLUMN source TEXT DEFAULT 'manual';  -- 'manual' | 'warung_mode' | 'barcode' | 'ocr'

CREATE INDEX meal_logs_combo_idx ON public.meal_logs(combo_id) WHERE combo_id IS NOT NULL;
```

This is minor but spec should call it out as part of Sprint W1 migration.

### M4. Spec's effort estimate is now inflated

With C1 + C2 fixes:

- ❌ Original W1: schema migration (3 hari) — actually ~1 hari (alter, not create)
- ❌ Original W4: combo schema — actually rolls into W1
- ✅ W2: prompt + schema upgrade unchanged
- ✅ W3: UI unchanged
- ✅ W4: QA unchanged but maybe shrinks

**Realistic revised total: ~2 minggu (was 2.5).**

---

## 🟢 ACCURATE claims (verified ✓)

These parts of the spec are correct:

| Claim                                                | Verification                                         |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `parseMenuImage` exists in `scanVision.functions.ts` | ✅ line 104                                          |
| `MenuImageSchema` defined as Zod schema              | ✅ line 72                                           |
| `/scan/menu` route uses `parseMenuImage`             | ✅ `src/routes/_authenticated/scan.menu.tsx` line 13 |
| `seo_recipes` table exists with Indonesian recipes   | ✅ migration `20260605030204`                        |
| Gemini multimodal via `callGeminiJson`               | ✅ `src/features/ai/lib/aiGateway.server.ts`         |
| `meal_logs` has calories, protein_g, carbs_g, fat_g  | ✅ verified                                          |
| RLS already on `meal_logs` (`own meals all`)         | ✅ verified                                          |
| VexoAPI + Gemini integration shipped (Sprint 2d)     | ✅ from `git log`                                    |
| Feature flag UI pattern exists (per AUDIT-019)       | ✅ per-user column                                   |

---

## 🔵 ADDITIONAL SUGGESTIONS (optional, after C1-C3 fixed)

### S1. Portion slider should also store `confidence_score`

User adjustments are valuable signal. Track:

- Original AI estimate (calories, portion_g)
- User-adjusted value (calories, portion_g)
- Delta (kcal diff, g diff)

→ Future training data for fine-tuning. Storage cost: trivial.

### S2. Add `image_id` to scan result for audit

Currently `parseMenuImage` doesn't log which image was processed. For PII /
PDP compliance, scan results should retain image reference (or just a hash)
for audit trail. Aligns with AUDIT-020 storage cleanup pattern.

### S3. Consider Indonesian fruit/vegetable aliasing

20 seeded items in `food_items` use simple Indonesian names. Real warteg
menus use regional terms: "sayur asem" vs "sayur asam" vs "asem asem".
Spec should explicitly budget for alias data quality.

---

## 📋 Action items before Sprint W1

| #   | Action                                                                                | Owner       | Effort |
| --- | ------------------------------------------------------------------------------------- | ----------- | ------ |
| 1   | Update spec section 3.1: replace `id_dish_reference` with `food_items` extensions     | Spec author | 5 min  |
| 2   | Update spec section 8: remove "Feature flag system ✅ shipped", choose option A/B/C/D | Spec author | 5 min  |
| 3   | Update spec section 3.3: add schema upgrade for `MenuImageSchema`                     | Spec author | 5 min  |
| 4   | Update spec effort estimate: 2.5 → 2 weeks                                            | Spec author | 1 min  |
| 5   | Verify `food_serving_sizes` table usage before designing portion templates (M1)       | Dev         | 1 hour |
| 6   | Add `meal_logs` migration column list to Sprint W1 (M3)                               | Spec author | 5 min  |
| 7   | (Optional) Add S1/S2/S3 suggestions if user wants                                     | Spec author | 10 min |

**Total to fix spec: ~30 min** + 1 hour dev verification.

After spec update, re-open PR #27 (push amendments to same branch) or open
new PR — same content scope, just corrections.

---

## Verdict

**Spec is APPROVED with revisions required.** Vision is right, but 3
critical inaccuracies would have wasted 1-2 sprint-days if not caught.
Fixes are mechanical (not design changes), so re-opening PR #27 is fast.

**Recommendation:** Don't start Sprint W1 until spec is corrected. The 30
min fix now saves 2-5 days later.
