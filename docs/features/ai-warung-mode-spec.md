# Spec — AI Warung Mode 🇮🇩

> **Status:** Draft, awaiting approval before implementation
> **Author:** Sprint planning, 2026-06-22
> **Source PRD:** `docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md` (Tier 1 #1)
> **Related:** Sprint 4a (Indonesian food database)

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

### 3.1 Indonesian Dish Reference Table

New Supabase table: `id_dish_reference`

```sql
create table public.id_dish_reference (
  id serial primary key,
  canonical_name text not null,           -- "Nasi goreng"
  aliases text[] not null default '{}',   -- ["Nasi Goreng Spesial", "Nasi Goreng Seafood"]
  category text not null,                 -- 'nasi' | 'lauk' | 'sayur' | 'sambal' | 'minuman' | 'pelengkap'
  default_portion_g numeric,              -- 200 (nasi), 50 (lauk), 30 (sambal)
  default_portion_label text,             -- "1 piring", "1 potong", "1 centong"
  calories_per_portion numeric not null,
  protein_g_per_portion numeric,
  carbs_g_per_portion numeric,
  fat_g_per_portion numeric,
  source text,                            -- 'TKPI Kemenkes' | 'OFF' | 'USDA' | 'manual'
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.id_dish_reference using gin (aliases);
create index on public.id_dish_reference (category);
```

**Seed data:** ~200 most common items across categories, sourced from:

- TKPI (Tabel Komposisi Pangan Indonesia) Kemenkes — public domain
- Indonesian Food Dataset (Kaggle, CC0, 1,346 items) — cherry-pick top 200
- Manual curation for top 20 warteg items per Sprint 4a

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

### 3.3 AI Prompt Upgrade

`scanVision.functions.ts::parseMenuImage` — change the prompt from generic
"OCR menu restoran" to Indonesian-context-aware:

```ts
const prompt = `
Kamu sedang scan menu warteg/warung/resto Indonesia. Untuk SETIAP item:
1. Identifikasi nama Indonesia (normalize: "Nasi Goreng Spesial" → "Nasi goreng")
2. Cocokkan dengan kategori: nasi/lauk/sayur/sambal/minuman/pelengkap
3. Estimasi PORSI STANDAR Indonesia:
   - Nasi: 100-150g per piring/centong (1 centong ≈ 100g)
   - Lauk (ayam/ikan/tempe): 40-60g per potong
   - Sayur: 60-100g per mangkok kecil
   - Sambal: 15-25g per sendok makan
4. Output kalori + makro per porsi standar (gunakan rujukan TKPI jika ragu)
5. Jika user scan KOMBO (nasi + lauk + sayur + minum), tandai sebagai combo

Balas JSON schema MenuImageSchema.
`.trim();
```

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

### 3.5 Combo Detection

When AI detects ≥3 items in a single scan with `nasi + lauk` both present,
tag the scan as `combo_type: 'warteg-standard'` and link the items via
`combo_id` UUID. Food log view shows "Paket Warteg — 545 kkal" instead of
3 separate items.

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

| Sprint        | Scope                                                           | Effort                  | Risk               |
| ------------- | --------------------------------------------------------------- | ----------------------- | ------------------ |
| **Sprint W1** | Schema migration + seed 200 dishes (manual curation top 50)     | 3 hari                  | Low                |
| **Sprint W2** | Portion templates + AI prompt upgrade + scanVision update       | 3 hari                  | Low                |
| **Sprint W3** | Post-scan adjuster UI (sliders + dropdowns + total live calc)   | 3 hari                  | Medium (UX detail) |
| **Sprint W4** | Combo detection + food_log schema update + QA with 5 beta users | 4 hari                  | Medium             |
| **Total**     |                                                                 | **~2.5 minggu** (1 dev) |                    |

After Sprint W4: feature ships behind flag `feature.warung_mode` (existing
feature flag system), 5% rollout → 25% → 100% over 2 weeks.

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

| Dep                                           | Status                                    | Owner |
| --------------------------------------------- | ----------------------------------------- | ----- |
| Sprint 5d article body fill (done)            | ✅ shipped                                | —     |
| `scanVision.functions.ts` exists              | ✅ shipped                                | —     |
| Indonesian food recipes in DB                 | ✅ shipped                                | —     |
| Feature flag system                           | ✅ shipped (AUDIT-019 PII toggle uses it) | —     |
| VexoAPI + Gemini multimodal working           | ✅ shipped (Sprint 2d)                    | —     |
| Open Food Facts API key (jika perlu fallback) | ❌ tidak dipakai                          | —     |

**No new external services needed.** All dependencies are internal Supabase
tables + existing AI infrastructure.

---

## 9. Open Questions (need user input)

1. **Seed data sourcing**: Manual curation top 50 warteg items dulu, atau langsung import 200 dari Kaggle dataset? (Manual = more accurate, slower; Kaggle = fast, may have Western bias)
2. **Combo UX**: Pakai "Save as combo" modal konfirmasi, atau auto-detect dengan chip "Paket warteg? ✓" di atas hasil scan?
3. **Bundle feature atau standalone**: AI Warung Mode sebagai mode di `/scan/menu` (bundle), atau jadi route baru `/scan/warung` (separate, easier A/B test)?
4. **Monetization signal**: Free for all, atau gate behind HealthyU+ subscription? (Pivots positioning)

---

## 10. Definition of Done

- [ ] `id_dish_reference` table created + migration applied to production
- [ ] ≥150 dishes seeded with verified nutrition (TKPI or manual)
- [ ] ≥5 portion templates defined (warteg, resto Padang, Chinese takeout, etc.)
- [ ] `parseMenuImage` uses new Indonesian prompt + post-parse fuzzy match
- [ ] `scan.menu.tsx` has post-scan adjuster UI (sliders + dropdowns)
- [ ] Combo detection saves with `combo_id` + combo UI in food log
- [ ] Tests: ≥85% accuracy on 20-scan sample, ≥70% unit coverage on portion-templates
- [ ] `bunx tsc --noEmit` 0 errors
- [ ] `bun run lint` 0 errors
- [ ] `bun run test` ≥90% passing (new tests for portion-templates + parseMenuImage)
- [ ] `bun run build` <550KB main bundle
- [ ] Feature flag `feature.warung_mode` default OFF, manual rollout
- [ ] Docs: `docs/features/ai-warung-mode.md` (user-facing) + this spec kept updated

---

## 11. Related Decisions

- **Why not just fine-tune a model?** Cost-prohibitive at MVP scale (~10K users). Prompt engineering + reference table achieves 85% accuracy without $5K/month GPU bill.
- **Why not just use OFF API?** Sparse ID coverage; warteg items aren't in OFF. Reference table is the source of truth.
- **Why combo system?** Matches real user mental model — they think "saya makan paket A" not "4 separate foods".

---

## Next Step

Awaiting approval on Open Questions (section 9). Once decided, kick off
**Sprint W1** with schema migration + manual seed curation.
