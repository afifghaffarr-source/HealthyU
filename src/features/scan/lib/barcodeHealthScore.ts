/**
 * Sprint 27 — Barcode Health Score Indonesia (Nutritrack-style grade A-E).
 *
 * Pure helper. No DB writes, no AI calls, no cron. Reads only the
 * `barcode_cache.raw` jsonb payload (same data already fetched from Open
 * Food Facts by `scanBarcode` and `lookupBarcode` server fns).
 *
 * Algorithm — Indonesia-style Nutritrack negative-weighted scoring:
 *   - Penalty: calories/100g, sugar_g/100g, saturated_fat_g/100g, sodium_g/100g
 *   - Bonus: protein_g/100g, fiber_g/100g
 *   - Final score clamped 0..100 → letter grade A..E
 *   - Each penalty/bonus also produces a short Indonesian reason label so the
 *     UI can surface WHY a product received its grade (transparency over
 *     algorithmic opacity).
 *
 * Ponytail rationale: grade-from-nutrients is a 6-variable piecewise function.
 * Doing it once in this pure helper, then exposing `getBarcodeHealthGrade`
 * server fn, avoids 5 different inline ad-hoc scorers across UI pages.
 */

export type NutriGrade = "A" | "B" | "C" | "D" | "E";

export interface NormalizedNutriments {
  caloriesPer100g: number | null;
  sugarPer100g: number | null;
  saturatedFatPer100g: number | null;
  sodiumPer100g: number | null; // grams; OFF API returns both salt and sodium
  proteinPer100g: number | null;
  fiberPer100g: number | null;
}

export interface BarcodeHealthGrade {
  /** 0..100 — continuous, not bucketed. */
  score: number;
  /** Letter grade derived from score. */
  grade: NutriGrade;
  /** Per-axis sub-scores (0..100) so UI can render small bars. */
  factors: Array<{ label: string; value: number }>;
  /** Short Indonesian reason lines explaining deduction/bonus. */
  reasons: string[];
  /** Whether enough data was present to give a confident grade. */
  reliable: boolean;
}

/**
 * Normalize Open Food Facts `nutriments` payload (many key variants) into a
 * stable shape. OFF uses snake_case with `_100g`, `_serving`, `__value`,
 * and the upper-case fallback `value` field. Sodium may appear as `salt`
 * (g) or `sodium` (g) — convert salt→sodium by ×0.4 (industry standard).
 */
export function extractNutriments(raw: unknown): NormalizedNutriments {
  const n = (raw ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = readNum(n[k]);
      if (v !== null) return v;
      // OFF also stores "value" fields under slightly different naming:
      // - `${k}_value`           (e.g. sugars_value for sugars_100g)
      // - `${k}_100g_value`
      // - bare root _value (e.g. energy-kcal_value without _100g)
      const baseSuffixes = ["_value", "_100g_value"];
      for (const sfx of baseSuffixes) {
        const v2 = readNum(n[`${k}${sfx}`]);
        if (v2 !== null) return v2;
      }
      // Strip a trailing `_100g` from the key and retry with the bare form.
      if (k.endsWith("_100g")) {
        const bare = k.slice(0, -"_100g".length);
        const barePick = pick(bare);
        if (barePick !== null) return barePick;
      }
    }
    return null;
  };
  const calories = pick("energy-kcal_100g");
  const sugar = pick("sugars_100g");
  const satFat = pick("saturated-fat_100g");
  // Prefer explicit sodium_100g; otherwise derive salt_100g → sodium (×0.4).
  let sodium: number | null = pick("sodium_100g");
  if (sodium === null) {
    const salt = pick("salt_100g");
    if (salt !== null) sodium = salt * 0.4;
  }
  const protein = pick("proteins_100g");
  const fiber = pick("fiber_100g");
  return {
    caloriesPer100g: calories,
    sugarPer100g: sugar,
    saturatedFatPer100g: satFat,
    sodiumPer100g: sodium,
    proteinPer100g: protein,
    fiberPer100g: fiber,
  };
}

function readNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v.replace(",", "."));
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

/**
 * Score a single axis from 0..100. `fn` returns value in `xScale` range;
 * below `warnAt` → 100, between warnAt and badAt → linear penalty,
 * above badAt → 0. For bonus axes, smaller-is-better=false flips direction.
 */
function axisScore(value: number, warnAt: number, badAt: number, smallerIsBetter = true): number {
  if (!Number.isFinite(value)) return 50; // unknown → neutral, not zero
  if (smallerIsBetter) {
    if (value <= warnAt) return 100;
    if (value <= badAt) return Math.round(100 - ((value - warnAt) / (badAt - warnAt)) * 70);
    // Beyond badAt: scale × distance, decay steeper (real-world: 5× sugar
    // IS meaningfully worse than 4× — there is no ceiling on health risk).
    const overScale = (value - badAt) / badAt;
    return Math.max(0, Math.round(25 - overScale * 50));
  }
  // larger-is-better (protein, fiber)
  if (value >= warnAt) {
    const overshoot = Math.min((value - warnAt) / warnAt, 1);
    return Math.min(100, Math.round(70 + overshoot * 30));
  }
  return Math.round((value / warnAt) * 70);
}

/**
 * Compute Indonesian Nutritrack-style grade from nutrients.
 *
 * Sub-score axes (each 0..100):
 *   - kalori (penalty; warnAt 250 kcal/100g, badAt 500)
 *   - gula   (penalty; warnAt  10 g/100g,  badAt  30)
 *   - lemak_jenuh (penalty; warnAt 5, badAt 15)
 *   - sodium (penalty; warnAt 0.4 (≈1 g salt), badAt 1.2)
 *   - protein (bonus)
 *   - serat  (bonus)
 *
 * Weighted average → 0..100. Reliability = at least calories + 2 other axes
 * known (so a totally blank product does NOT get an arbitrary grade).
 */
export function scoreBarcodeProduct(input: NormalizedNutriments | unknown): BarcodeHealthGrade {
  const n: NormalizedNutriments =
    typeof (input as NormalizedNutriments)?.caloriesPer100g === "number" ||
    (input as NormalizedNutriments)?.caloriesPer100g === null
      ? (input as NormalizedNutriments)
      : extractNutriments(input);

  const knownCount = [
    n.caloriesPer100g,
    n.sugarPer100g,
    n.saturatedFatPer100g,
    n.sodiumPer100g,
    n.proteinPer100g,
    n.fiberPer100g,
  ].filter((v) => v !== null).length;
  const reliable = knownCount >= 3;

  const calories = axisScore(n.caloriesPer100g ?? Number.NaN, 250, 500, true);
  const sugar = axisScore(n.sugarPer100g ?? Number.NaN, 10, 30, true);
  const satFat = axisScore(n.saturatedFatPer100g ?? Number.NaN, 5, 15, true);
  const sodium = axisScore(n.sodiumPer100g ?? Number.NaN, 0.4, 1.2, true);
  const protein = axisScore(n.proteinPer100g ?? Number.NaN, 12, 20, false);
  const fiber = axisScore(n.fiberPer100g ?? Number.NaN, 6, 12, false);

  const factors = [
    { label: "Kalori", value: calories },
    { label: "Gula", value: sugar },
    { label: "Lemak jenuh", value: satFat },
    { label: "Sodium", value: sodium },
    { label: "Protein", value: protein },
    { label: "Serat", value: fiber },
  ];

  const weighted =
    calories * 0.25 + sugar * 0.25 + satFat * 0.2 + sodium * 0.15 + protein * 0.1 + fiber * 0.05;

  const score = Math.max(0, Math.min(100, Math.round(weighted)));
  const grade: NutriGrade =
    score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "E";

  const reasons: string[] = [];
  if ((n.sugarPer100g ?? 0) >= 20) reasons.push("Gula tinggi");
  if ((n.saturatedFatPer100g ?? 0) >= 8) reasons.push("Lemak jenuh tinggi");
  if ((n.sodiumPer100g ?? 0) >= 0.8) reasons.push("Sodium tinggi");
  if ((n.caloriesPer100g ?? 0) >= 450) reasons.push("Kalori padat per 100g");
  if ((n.proteinPer100g ?? 0) >= 12) reasons.push("Kaya protein");
  if ((n.fiberPer100g ?? 0) >= 6) reasons.push("Kaya serat");

  return { score, grade, factors, reasons, reliable };
}
