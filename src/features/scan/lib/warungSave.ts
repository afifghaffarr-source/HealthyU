/**
 * Sprint 22 — AI Warung Mode Nasi Intelligence wiring.
 *
 * Maps AdjustedItem[] from PostScanAdjuster → the exact shape that the
 * existing `logMealWithItems` server fn accepts. Pure function so it's
 * trivially unit-testable.
 *
 * Why a separate mapper (vs inlining in scan.menu.tsx):
 *   - The mapping has subtle precedence rules: verified TKPI > AI estimate
 *     > fallback. Pulling into a pure function lets us regression-test it
 *     without spinning up a Supabase client.
 *   - Keeps the route file lean — the route owns routing + UI, the lib owns
 *     domain rules.
 *
 * ponytail:
 *   - reuses existing logMealWithItems server fn (no new fn)
 *   - reuses existing meal_log_items schema
 *   - reuses existing track() telemetry (Sprint 19 helper)
 */

export type WarungAdjustedItem = {
  name: string;
  description?: string;
  canonical_name?: string | null;
  est_calories?: number;
  est_protein_g?: number;
  est_carbs_g?: number;
  est_fat_g?: number;
  est_portion_g?: number;
  food_item_id?: number | string | null; // Supabase schema is `uuid` (string) at runtime,
  // but the image-parser occasionally returns numeric
  // identifiers from older catalog rows. Mapper
  // coerces to string.
  verified_nutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
    serving_size: number;
    serving_unit: string;
    portion_label?: string | null;
  } | null;
  adjusted_portion_g: number;
  adjusted_calories: number;
};

export type WarungLogItem = {
  food_item_id: string | null;
  food_name: string;
  serving_qty: number;
  serving_unit: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/**
 * Extract protein/carbs/fat for one food item, preferring verified TKPI
 * nutrition (scaled by user's adjusted portion) over AI estimates.
 * Returns zeros (not NaN/null) when nothing is known — server logs accept 0.
 */
export function estimateMacros(item: WarungAdjustedItem): {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const portion = Math.max(1, item.adjusted_portion_g);
  if (item.verified_nutrition) {
    const v = item.verified_nutrition;
    const scale = portion / Math.max(1, v.serving_size);
    return {
      protein_g: round1(v.protein_g * scale),
      carbs_g: round1(v.carbs_g * scale),
      fat_g: round1(v.fat_g * scale),
    };
  }
  // AI estimates are PER detected serving (est_portion_g). Scale to the
  // user-adjusted portion proportionally.
  // Guard: when est_portion_g is 0/missing/useless, the AI estimate is
  // already in the absolute detected portion's space (or the scan didn't
  // capture portion info). Don't inflate 80x by dividing by 1.
  const est = item.est_portion_g ?? 0;
  const basePortion = est > 0 ? est : portion;
  const scale = portion / basePortion;
  return {
    protein_g: round1((item.est_protein_g ?? 0) * scale),
    carbs_g: round1((item.est_carbs_g ?? 0) * scale),
    fat_g: round1((item.est_fat_g ?? 0) * scale),
  };
}

/**
 * Map user-adjusted scanner items → the schema that logMealWithItems expects.
 *
 * Rules (locked by tests):
 *   - food_name: prefers canonical_name > name (canonical wins for matching
 *     later in nutrition lookup)
 *   - food_item_id: must be string uuid; coerce numbers to string (DB schema
 *     `uuid`) — null if the scan didn't match an existing food_items row
 *   - serving_qty: adjusted_portion_g / verified serving_size when known;
 *     otherwise 1 (the scan already estimated the portion in grams, and
 *     grams are stored on the items row)
 *   - serving_unit: from verified_nutrition.serving_unit when known
 *   - calories: uses the AdjustedItem's pre-computed adjusted_calories
 *     (PostScanAdjuster already scales this live)
 */
export function mapAdjustedToLogItems(items: WarungAdjustedItem[]): WarungLogItem[] {
  return items.map((item) => {
    const { protein_g, carbs_g, fat_g } = estimateMacros(item);
    const v = item.verified_nutrition;
    const serving_qty = v ? round2(item.adjusted_portion_g / Math.max(1, v.serving_size)) : 1;
    const rawFoodItemId = item.food_item_id;
    const food_item_id =
      rawFoodItemId == null
        ? null
        : typeof rawFoodItemId === "number"
          ? String(rawFoodItemId)
          : rawFoodItemId;
    return {
      food_item_id,
      food_name: (item.canonical_name || item.name || "Makanan").slice(0, 120),
      serving_qty,
      serving_unit: v?.serving_unit ?? null,
      calories: Math.max(0, Math.round(item.adjusted_calories)),
      protein_g,
      carbs_g,
      fat_g,
    };
  });
}

/**
 * Best-effort detection of meal_type from the canonical items.
 *
 *   - "Sarapan" / breakfast templates → "breakfast"
 *   - "Gorengan"/snack tagged items  → "snack"
 *   - Anything else                    → "lunch" (the scan flow is
 *                                          meal-of-the-day oriented)
 *
 * Caller can override via the returned `notes` field.
 */
export function detectWarungMealType(
  items: WarungAdjustedItem[],
): "breakfast" | "lunch" | "dinner" | "snack" {
  const joined = items
    .map((i) => `${i.canonical_name ?? ""} ${i.name ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (/sarapan|nasi uduk|lontong sayur|breakfast/.test(joined)) return "breakfast";
  if (/gorengan|risol|bakwan|pisang goreng|snack|kue/.test(joined)) return "snack";
  if (/malam|dinner/.test(joined)) return "dinner";
  return "lunch";
}

function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
