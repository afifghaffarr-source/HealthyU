# Spec — AI Warung Mode 🇮🇩

> **Status:** Draft v2 (post-review corrections), awaiting approval before implementation
> **Author:** Sprint planning, 2026-06-22 (rev. 2026-06-22 per `docs/features/ai-warung-mode-review.md`)
> **Source PRD:** `docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md` (Tier 1 #1)
> **Related:** Sprint 4a (Indonesian food database)

---

## Revision History

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                  |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| v1      | 2026-06-22 | Initial draft                                                                                                                                                                                                                                                                                                            |
| v2      | 2026-06-22 | Review fixes (per `ai-warung-mode-review.md`): C1 extend `food_items` (not new table), C2 add feature flag option (Option A chosen), C3 upgrade `MenuImageSchema` with protein/carbs/fat/category/portion_g fields, M1 mention `food_serving_sizes` integration, M3 add `meal_logs` migration columns. Effort 2.5w → 2w. |

---

## TL;DR

HealthyU users eat at warteg/warung/resto Padang 3-5×/week. Current menu-scan
(generic Gemini prompt) gives plausible but unreliable calorie estimates
because the model doesn't know Indonesian portion conventions. **AI Warung
Mode** layers:

1. An **Indonesian food reference table** (~200 most common dishes with
   canonicalized nutrition per standard portion), and
2. A **portion-template system** (nasi + lauk + sayur + sambal + minum)
   applied at scan time, and
3. A **post-scan adjuster UI** so the user can correct "1 centong nasi" →
   "1.5 centong" before saving.

Result: a warteg scan with `Nasi putih + Ayam goreng + Sayur asem + Sambal
terasi + Es teh manis` saves with ~85% accuracy instead of ~55%.

---

## 1. Problem

| Observation                                          | Evidence                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current scan accuracy is mediocre for ID dishes.** | Existing prompt `"OCR menu restoran"` lets Gemini hallucinate gram weights for "Nasi Goreng Spesial" etc. No ground truth to anchor against. |
| **Portion ambiguity is huge.**                       | "Nasi" = 100g (resto) or 150g (warteg centong nasi) or 80g (nasi timbel). One word, 2× calorie range.                                        |
| **No combo awareness.**                              | User eats "paket nasi + lauk + sayur + es teh" but app tracks each as separate item, doesn't flag the combo pattern.                         |
| **Sambal/condiments missed.**                        | Sambal terasi = ~50 kcal per scoop. User almost never logs it. AI can't see it in photo.                                                     |
| **Competitor gap.**                                  | MyFitnessPal DB has weak ID coverage; OFF has 1.7M global products but sparse for warteg/warung items.                                       |

---

## 2. Existing State (already shipped — no need to rebuild)

| Component                           | Location                                                        | Status                                 |
| ----------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| Menu image scan (Gemini multimodal) | `src/features/scan/lib/scanVision.functions.ts::parseMenuImage` | ✅ shipped, generic prompt             |
| Menu scan UI route                  | `src/routes/_authenticated/scan.menu.tsx`                       | ✅ shipped, label "Scan Menu Restoran" |
| Recipe + article scan               | `src/features/scan/lib/scanVision.functions.ts`                 | ✅ shipped                             |
| Indonesian food recipes (DB)        | `seo_recipes` table, ~38 published                              | ✅ shipped (Sprint 5b/6b)              |
| Indonesian articles (DB)            | `articles` table, ~15 published                                 | ✅ shipped (Sprint 5d)                 |
| Barcode lookup (OFF integration)    | `src/features/scan/lib/scanBarcode.functions.ts`                | ✅ shipped                             |
| AI Coach + chat safety              | `src/features/chat/`                                            | ✅ shipped                             |

**Key insight:** The scan pipeline already exists. We're not building a new
feature — we're upgrading the existing one with Indonesian-specific context.

---

## 3. What to Build (the delta)

### 3.1 Extend Existing `food_items` Table

**Background:** `public.food_items` already exists (`supabase/migrations/20260603045312`)
with 20 Indonesian foods seeded (Nasi Putih, Ayam Goreng, Rendang Sapi, Soto
Ayam, Gado-Gado, Tempe Goreng, Tahu Goreng, Bakso, Mie Ayam, Sate Ayam, etc.).

Current schema:

```sql
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  calories NUMERIC NOT NULL,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  fiber_g NUMERIC DEFAULT 0,
  serving_size NUMERIC DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  is_indonesian BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Migration:** Extend with alias support + portion labels + source attribution:

```sql
-- Sprint W1 migration: extend food_items for warung mode
ALTER TABLE public.food_items
  ADD COLUMN aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN portion_label TEXT,                    -- '1 piring', '1 centong', '1 potong', etc.
  ADD COLUMN source TEXT DEFAULT 'manual',          -- 'TKPI' | 'OFF' | 'USDA' | 'manual' | 'kaggle'
  ADD COLUMN source_url TEXT,
  ADD COLUMN confidence_score NUMERIC DEFAULT 0.5,  -- 0-1, used by fuzzy match
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- GIN index for alias lookup (fast fuzzy match)
CREATE INDEX food_items_aliases_idx ON public.food_items USING gin (aliases);

-- Trigger to auto-update updated_at
CREATE TRIGGER food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing 20 seeds with aliases + portion_label
UPDATE public.food_items SET
  aliases = ARRAY['nasi putih', 'nasi'],
  portion_label = '1 piring',
  source = 'TKPI'
WHERE name = 'Nasi Putih';

UPDATE public.food_items SET
  aliases = ARRAY['nasi goreng', 'nasgor', 'nasi goreng spesial'],
  portion_label = '1 piring',
  source = 'TKPI'
WHERE name = 'Nasi Goreng';

UPDATE public.food_items SET
  aliases = ARRAY['ayam goreng', 'ayam', 'ayam goreng crispy'],
  portion_label = '1 potong',
  source = 'TKPI'
WHERE name = 'Ayam Goreng';

-- ... (17 more UPDATEs for remaining seeds)
```

**Seed expansion:** Add 180 more common Indonesian dishes from TKPI + Kaggle
Indonesian Food Dataset (CC0, 1,346 items). Manual curation prioritizes:

1. **Top 50 warteg items** (nasi, ayam, ikan, tempe, tahu, sayur asem, sayur
   lodeh, soto, gado-gado, dll) — Sprint W1
2. **Top 50 resto Padang** (rendang variants, gulai, ayam pop, ikan bakar,
   sambal variants) — Sprint W1
3. **Top 50 drinks + condiments** (es teh, es jeruk, sambal terasi, sambal
   matah, kerupuk, dll) — Sprint W1
4. **Remaining 30** (Chinese takeout, bakery, snacks) — Sprint W2 if time

**Result:** `food_items` table grows from 20 → ~200 items with full alias
coverage + portion labels.

### 3.2 Portion Template System

TypeScript module: `src/features/scan/lib/portion-templates.ts`

```ts
export type PortionTemplate = {
  id: string;
  label: string; // "Paket Nasi + Lauk + Sayur"
  items: Array<{
    category: "nasi" | "lauk" | "sayur" | "sambal" | "minuman";
    defaultPortionG: number;
    required: boolean;
  }>;
  totalCaloriesEstimate: number;
};

export const WARTEG_TEMPLATE: PortionTemplate = {
  id: "warteg-standard",
  label: "Warteg — Nasi + Lauk + Sayur",
  items: [
    { category: "nasi", defaultPortionG: 150, required: true }, // 1.5 centong
    { category: "lauk", defaultPortionG: 50, required: true }, // 1 potong
    { category: "sayur", defaultPortionG: 80, required: false },
    { category: "sambal", defaultPortionG: 20, required: false },
    { category: "minuman", defaultPortionG: 250, required: false },
  ],
  totalCaloriesEstimate: 650,
};
```

**Integration with `food_serving_sizes`:** The existing `public.food_serving_sizes`
table (migration `20260603084749`) should be verified during Sprint W1. If
populated, portion templates should reference it as a secondary lookup
(primary = `food_items.portion_label`, fallback = `food_serving_sizes`). If
empty, populate it alongside `food_items` seed expansion.

### 3.3 AI Prompt Upgrade + Schema Extension

**Current state:** `src/features/scan/lib/scanVision.functions.ts:72-115`

```ts
const MenuImageSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().default(""),
        price: z.number().optional(),
        description: z.string().optional(),
        est_calories: z.number().optional(),
      }),
    )
    .default([]),
});

export const parseMenuImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgIn.parse(input))
  .handler(async ({ data, context }) => {
    const parsed = await callGeminiJson(
      'OCR menu restoran. Balas JSON {"items":[{"name":"...","price":12345,"description":"...","est_calories":420}]}',
      data.image_data_url,
      "scan.menu.image",
      context.userId,
      MenuImageSchema,
      { items: [] },
    );
    return { items: parsed.items };
  });
```

**Schema upgrade:** Add macros + portion + category fields:

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
            "other",
          ])
          .optional(),
      }),
    )
    .default([]),
});
```

**Prompt upgrade:** Replace generic "OCR menu restoran" with Indonesian-context-aware:

```ts
const prompt = `
Kamu sedang scan menu warteg/warung/resto Indonesia. Untuk SETIAP item:

1. **Identifikasi nama Indonesia** (normalize: "Nasi Goreng Spesial" → "Nasi goreng")
2. **Cocokkan dengan kategori**: nasi / lauk / sayur / sambal / minuman / pelengkap / other
3. **Estimasi PORSI STANDAR Indonesia**:
   - Nasi: 100-150g per piring/centong (1 centong ≈ 100g)
   - Lauk (ayam/ikan/tempe): 40-60g per potong
   - Sayur: 60-100g per mangkok kecil
   - Sambal: 15-25g per sendok makan
   - Minuman: 200-300ml per gelas
4. **Output kalori + makro per porsi standar** (gunakan rujukan TKPI jika ragu)
5. **Semua field opsional** — jika tidak yakin, skip field tersebut (jangan hallucinate)
6. **Jika user scan KOMBO** (nasi + lauk + sayur + minum), tetap pisah per item

Balas JSON sesuai schema MenuImageSchema.
`.trim();

export const parseMenuImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgIn.parse(input))
  .handler(async ({ data, context }) => {
    const parsed = await callGeminiJson(
      prompt,
      data.image_data_url,
      "scan.menu.image",
      context.userId,
      MenuImageSchema,
      { items: [] },
    );
    return { items: parsed.items };
  });
```

**Post-parse fuzzy match:** After Gemini returns items, run fuzzy match against
`food_items.aliases` to normalize names + fill missing macros from DB. This
happens server-side before returning to client.

**Note:** Gemini structured output quality degrades with 7+ fields per item.
Prompt explicitly says "skip field jika tidak yakin" to reduce hallucination.
Fuzzy match fills gaps from DB.

### 3.4 Post-Scan Adjuster UI

`src/routes/_authenticated/scan.menu.tsx` — after parse result shows, add:

```
┌────────────────────────────────────────┐
│ Hasil Scan Menu                        │
│                                        │
│ 1. Nasi putih           [150g]  200 kkal│
│    Porsi: ────●────── 100-200g        │
│           [1 centong ▼]                │
│                                        │
│ 2. Ayam goreng          [50g]   165 kkal│
│    Porsi: ─●───────── 30-80g          │
│           [1 potong ▼]                 │
│                                        │
│ 3. Sayur asem           [80g]    35 kkal│
│    Porsi: ──●──────── 60-120g         │
│           [1 mangkok kecil ▼]         │
│                                        │
│ 4. Sambal terasi        [20g]    45 kkal│
│    Porsi: ───●─────── 10-30g          │
│           [1 sdm ▼]                    │
│                                        │
│ 5. Es teh manis         [250ml] 100 kkal│
│    Porsi: ──●──────── 200-350ml       │
│           [1 gelas ▼]                 │
│                                        │
│ Total estimasi: 545 kkal               │
│ [Simpan ke log]    [Scan ulang]        │
└────────────────────────────────────────┘
```

User adjusts sliders OR picks from dropdown ("1 centong", "1 piring", etc.).
On "Simpan ke log", creates individual food_log entries + a "combo" tag.

### 3.5 Combo Detection + `meal_logs` Schema Extension

When AI detects ≥3 items in a single scan with `nasi + lauk` both present,
tag the scan as `combo_type: 'warteg-standard'` and link the items via
`combo_id` UUID. Food log view shows "Paket Warteg — 545 kkal" instead of
3 separate items.

**Schema migration (Sprint W1):** Extend `meal_logs` to support combos + tracking:

```sql
-- Sprint W1: extend meal_logs for combo tracking + warung mode metadata
ALTER TABLE public.meal_logs
  ADD COLUMN combo_id UUID,
  ADD COLUMN combo_name TEXT,                       -- 'Paket Warteg', 'Paket Padang', etc.
  ADD COLUMN portion_adjusted BOOLEAN DEFAULT FALSE, -- user changed slider post-scan
  ADD COLUMN portion_g NUMERIC,                      -- actual portion in grams
  ADD COLUMN source TEXT DEFAULT 'manual';           -- 'manual' | 'warung_mode' | 'barcode' | 'ocr' | 'voice'

CREATE INDEX meal_logs_combo_idx ON public.meal_logs(combo_id) WHERE combo_id IS NOT NULL;
CREATE INDEX meal_logs_source_idx ON public.meal_logs(source);
```

**Combo detection logic:** Server-side in `parseMenuImage` handler after fuzzy match:

```ts
// After fuzzy match fills macros from food_items...
const hasNasi = parsed.items.some((i) => i.category === "nasi");
const hasLauk = parsed.items.some((i) => i.category === "lauk");
const isCombo = parsed.items.length >= 3 && hasNasi && hasLauk;

if (isCombo) {
  const comboId = crypto.randomUUID();
  return {
    items: parsed.items,
    combo: {
      id: comboId,
      name: "Paket Warteg",
      totalCalories: parsed.items.reduce((sum, i) => sum + (i.est_calories || 0), 0),
    },
  };
}
return { items: parsed.items };
```

UI then shows combo chip + option to "Simpan sebagai paket" vs "Simpan terpisah".

---

## 4. Success Criteria

| Metric                            | Target                                                      | How to measure                                         |
| --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| **Accuracy vs TKPI ground truth** | ≥85% within ±10% kcal                                       | Sample 20 warteg scans; manual recount by nutritionist |
| **User adjustment rate**          | ≤30% of items adjusted post-parse                           | Track `portion_adjusted` flag in scan result           |
| **Combo adoption**                | ≥40% of warteg scans saved as combo (vs 3 individual items) | Track `combo_id` presence in food_log                  |
| **Sambal inclusion**              | ≥50% of scans with visible sambal detect it                 | Manual QA of 50 random scans                           |
| **Latency**                       | p95 <4s for parse (Gemini multimodal + table lookup)        | Vercel Analytics                                       |
| **Bundle size impact**            | Main bundle +<20KB                                          | `bun run build` size check                             |

---

## 5. Effort Estimate

| Sprint        | Scope                                                                                                               | Effort                | Risk               |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ |
| **Sprint W1** | Migration (extend `food_items` + `meal_logs`) + seed 150 dishes (manual top 50 + Kaggle 100) + alias UPDATEs        | 2 hari                | Low                |
| **Sprint W2** | Portion templates + AI prompt upgrade + `MenuImageSchema` extension + fuzzy match logic + scanVision handler update | 3 hari                | Low                |
| **Sprint W3** | Post-scan adjuster UI (sliders + dropdowns + total live calc) + combo chip                                          | 3 hari                | Medium (UX detail) |
| **Sprint W4** | Combo save logic + per-user toggle (`profiles.warung_mode_enabled`) + QA with 5 beta users                          | 3 hari                | Medium             |
| **Total**     |                                                                                                                     | **~2 minggu** (1 dev) |                    |

**Effort reduction from v1 spec:** Original estimate was 2.5w based on creating new
`id_dish_reference` table (3 days Sprint W1). Actual work extends existing
`food_items` (~1 day migration + seeds) + combo schema folded into W1, saving
~3-4 days total.

After Sprint W4: feature ships with per-user opt-in toggle `profiles.warung_mode_enabled`
(default OFF). Rollout: internal testing (5 users, 1 week) → 5% beta opt-in →
25% → 100% over 2 weeks.

---

## 6. Risks

| Risk                                          | Severity | Mitigation                                                                                                                            |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **AI hallucinates Indonesian dish names**     | Medium   | Strict prompt + post-parse fuzzy match against `id_dish_reference.aliases`; if no match, fallback to generic with low-confidence flag |
| **TKPI licensing unclear**                    | Low      | TKPI is published by Kemenkes as public-domain reference data; if issues arise, switch to manual seed                                 |
| **User portion adjustment fatigue**           | Medium   | Save user's last portion choice per dish, default to it next scan (Dexie-backed)                                                      |
| **Combo detection false positives**           | Low      | Require explicit user confirmation "Save as combo?" when ambiguous                                                                    |
| **Schema migration breaks existing food_log** | Medium   | New tables only (`id_dish_reference`, `portion_adjusted` flag on food_log); zero-touch migration                                      |
| **Bundle bloat from portion templates**       | Low      | Templates are <5KB TS, lazy-imported only on `/scan/menu` route                                                                       |
| **AI cost spike**                             | Low      | Gemini Flash pricing; portion templates reduce prompt token count via concise context                                                 |

---

## 7. Out of Scope (deferred)

- OCR label nutrisi (already in `scan.nutrition-label.tsx`)
- Barcode health score (PRD Tier 1 #3, separate spec)
- Restaurant chain API integration (e.g. data dari McD Indonesia) — needs partnership
- Family meal planning (PRD Tier 1 #9)
- Price comparison antar warung — beda use case, PRD Tier 2

---

## 8. Dependencies & Prerequisites

| Dep                                           | Status                                                               | Owner |
| --------------------------------------------- | -------------------------------------------------------------------- | ----- |
| Sprint 5d article body fill (done)            | ✅ shipped                                                           | —     |
| `scanVision.functions.ts` exists              | ✅ shipped                                                           | —     |
| Indonesian food recipes in DB                 | ✅ shipped                                                           | —     |
| `food_items` table with 20 ID foods seeded    | ✅ shipped (migration `20260603045312`)                              | —     |
| `meal_logs` table                             | ✅ shipped (migration `20260603045312`)                              | —     |
| `food_serving_sizes` table                    | ✅ shipped (migration `20260603084749`, verify population Sprint W1) | —     |
| VexoAPI + Gemini multimodal working           | ✅ shipped (Sprint 2d)                                               | —     |
| Open Food Facts API key (jika perlu fallback) | ❌ tidak dipakai                                                     | —     |

**Feature rollout mechanism (NEW — Sprint W4):**

Per-user opt-in toggle via `profiles` table (matches AUDIT-019 pattern):

```sql
-- Sprint W4 migration: add per-user warung mode toggle
ALTER TABLE public.profiles
  ADD COLUMN warung_mode_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX profiles_warung_mode_idx ON public.profiles(warung_mode_enabled) WHERE warung_mode_enabled = TRUE;
```

Rollout strategy:

1. **Internal testing** (5 users, 1 week) — manually flip `warung_mode_enabled = TRUE` for test accounts
2. **5% beta opt-in** — add in-app CTA "Coba AI Warung Mode (beta)" in `/scan/menu` route header, flips user's column to TRUE on click
3. **25% expansion** — promote CTA to banner on `/` landing for users with ≥3 warteg scans in history
4. **100% rollout** — flip default to TRUE for all new users, keep existing users opt-in

**Why per-user column instead of percentage-based feature flag:**

- HealthyU does not have generic feature flag infrastructure (no `feature_flags` table, no rollout % system)
- Existing `useOnboardingFlag` hook is localStorage-based "show once" UX helper, not a server-side gate
- AUDIT-019 (`profiles.chat_redact_pii`) established the per-user boolean pattern
- Option A (per-user column) = S effort, Option B (build generic infra) = M effort + reusable but out of scope for this spec

**No new external services needed.** All dependencies are internal Supabase
tables + existing AI infrastructure.

---

## 9. Design Decisions (RESOLVED 2026-06-22)

| ID     | Question             | Decision                                                                                                                         | Rationale                                                                                                                                                                                                                                                         |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | Seed data strategy   | **Hybrid (Option C)**: Manual curate top 50 warteg essentials + Kaggle 100 filtered by `is_indonesian=true` + category relevance | Balance speed (1 day vs 2-3 days pure manual) with quality. Manual ensures top 50 are 100% accurate for most common use cases, Kaggle expands coverage for edge cases. Confidence audit pass required before merge.                                               |
| **Q2** | Combo UX pattern     | **Auto-detect chip (Option B)**: Chip appears above scan results "Paket Warteg detected 🍛" with dismiss (X) button              | Lowest friction — 0 extra taps if user agrees with combo, 1 tap to dismiss if not. Higher adoption than modal confirmation. Matches mobile-first UX preference.                                                                                                   |
| **Q3** | Implementation scope | **Bundle upgrade (Option A)**: Extend existing `/scan/menu` route, gated by `profiles.warung_mode_enabled` toggle                | Smaller diff (~300 LOC vs ~400 new), reuses UI components, users already familiar with route. Per-user toggle enables A/B without route split. Rollback = revert commit.                                                                                          |
| **Q4** | Monetization gate    | **Free for all (Option A)**: No paywall, prioritize adoption over revenue                                                        | Indonesia market price-sensitive. Differentiation via adoption first. Monetize later via: (1) Offline Diary Mode subscription, (2) AI Ramadhan Coach premium, (3) Sponsored food items (brand-verified nutrition data). Premium value stacks on top of free base. |

**Approved by:** User (2026-06-22 03:11 UTC)  
**Status:** Spec finalized, ready for Sprint W1 implementation

---

## 10. Definition of Done

- [ ] `food_items` table extended with `aliases[]`, `portion_label`, `source`, `source_url`, `confidence_score`, `updated_at` columns (migration applied to production)
- [ ] ≥150 dishes seeded with verified nutrition: top 50 manual warteg essentials + 100 Kaggle filtered (TKPI/manual source attribution)
- [ ] ≥5 portion templates defined (warteg, resto Padang, Chinese takeout, etc.) in `src/features/scan/lib/portion-templates.ts`
- [ ] `MenuImageSchema` extended with `est_protein_g`, `est_carbs_g`, `est_fat_g`, `est_portion_g`, `category` fields
- [ ] `parseMenuImage` uses new Indonesian-context prompt + post-parse fuzzy match against `food_items.aliases`
- [ ] `scan.menu.tsx` has post-scan adjuster UI (sliders + dropdowns + live total calories)
- [ ] Auto-detect combo chip UI ("Paket Warteg detected 🍛" with dismiss X button)
- [ ] `meal_logs` extended with `combo_id`, `combo_name`, `portion_adjusted`, `portion_g`, `source` columns
- [ ] Combo detection logic saves linked items with shared `combo_id` UUID
- [ ] `profiles.warung_mode_enabled` column added (default FALSE, per-user opt-in toggle)
- [ ] Tests: ≥85% accuracy on 20-scan sample, ≥70% unit coverage on portion-templates + fuzzy match
- [ ] `bunx tsc --noEmit` 0 errors
- [ ] `bun run lint` 0 errors
- [ ] `bun run test` ≥90% passing (new tests for portion-templates + parseMenuImage + fuzzy match)
- [ ] `bun run build` <550KB main bundle
- [ ] Per-user toggle rollout: internal (5 users, 1w) → 5% beta opt-in CTA → 25% → 100%
- [ ] Docs: `docs/features/ai-warung-mode.md` (user-facing how-to) + this spec kept updated

---

## 11. Related Decisions

- **Why not just fine-tune a model?** Cost-prohibitive at MVP scale (~10K users). Prompt engineering + reference table achieves 85% accuracy without $5K/month GPU bill.
- **Why not just use OFF API?** Sparse ID coverage; warteg items aren't in OFF. Reference table is the source of truth.
- **Why combo system?** Matches real user mental model — they think "saya makan paket A" not "4 separate foods".

---

## Next Step

**Spec finalized 2026-06-22 03:11 UTC.** All design decisions resolved (section 9).

Ready to kick off **Sprint W1** with:

1. Migration SQL (extend `food_items` + `meal_logs`)
2. Manual seed curation (top 50 warteg essentials)
3. Kaggle import + filtering (100 items, `is_indonesian=true`)
4. Alias UPDATEs for existing 20 seeds

Estimated Sprint W1 completion: 2 hari (1 dev).
