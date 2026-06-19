/**
 * Unit tests for Sprint 5a Meal Plan refactor:
 * - Zod schemas (`PlanMealSchema`, `PlanResultSchema`) — exported for testability
 * - `adaptTemplateMeals` — pure helper that normalizes `meal_plan_templates.meals`
 *   (Json type from Supabase) into the canonical `PlanMeal[]` shape
 * - `isUsablePlan` — gate that decides AI success vs template fallback
 *
 * Why we test these in isolation:
 * - The server fn (`generateMealPlan`) is wrapped in `createServerFn` which
 *   makes direct invocation awkward. The interesting branches (schema
 *   validation, template normalization, fallback decision) live in pure
 *   helpers that are exported specifically for this purpose.
 * - End-to-end behavior is covered by the live /recommendations page test.
 */
import { describe, expect, it } from "vitest";
import {
  PlanMealSchema,
  PlanResultSchema,
  adaptTemplateMeals,
  isUsablePlan,
} from "@/features/recommendations/lib/recommendations.functions";

// ──────────────────────────────────────────────────────────────────────────
// PlanMealSchema — input validation
// ──────────────────────────────────────────────────────────────────────────
describe("PlanMealSchema", () => {
  it("accepts a valid meal with all macros", () => {
    const parsed = PlanMealSchema.parse({
      meal_type: "breakfast",
      name: "Omelet putih telur",
      calories: 320,
      protein_g: 25,
      carbs_g: 8,
      fat_g: 18,
      planned_qty: 1,
      reason: "Tinggi protein, rendah kalori",
    });
    expect(parsed.meal_type).toBe("breakfast");
    expect(parsed.calories).toBe(320);
  });

  it("accepts a minimal meal (only required fields)", () => {
    const parsed = PlanMealSchema.parse({
      meal_type: "snack",
      name: "Yogurt",
      calories: 150,
    });
    expect(parsed.planned_qty).toBe(1); // default
    expect(parsed.reason).toBe(""); // default
    expect(parsed.protein_g).toBeUndefined();
  });

  it("rejects unknown meal_type", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "supper", name: "x", calories: 100 })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "lunch", name: "", calories: 100 })).toThrow();
  });

  it("rejects negative calories", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: -50 })).toThrow();
  });

  it("rejects non-integer calories", () => {
    expect(() =>
      PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: 100.5 }),
    ).toThrow();
  });

  it("rejects ridiculous calories (>5000)", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: 6000 })).toThrow();
  });

  it("rejects planned_qty out of range", () => {
    expect(() =>
      PlanMealSchema.parse({
        meal_type: "lunch",
        name: "x",
        calories: 100,
        planned_qty: 0,
      }),
    ).toThrow();
    expect(() =>
      PlanMealSchema.parse({
        meal_type: "lunch",
        name: "x",
        calories: 100,
        planned_qty: 25,
      }),
    ).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PlanResultSchema — AI response validation
// ──────────────────────────────────────────────────────────────────────────
describe("PlanResultSchema", () => {
  it("accepts a valid result with 4 meals", () => {
    const parsed = PlanResultSchema.parse({
      summary: "Rencana makan untuk Anda",
      meals: [
        { meal_type: "breakfast", name: "A", calories: 300 },
        { meal_type: "lunch", name: "B", calories: 600 },
        { meal_type: "snack", name: "C", calories: 200 },
        { meal_type: "dinner", name: "D", calories: 500 },
      ],
    });
    expect(parsed.meals).toHaveLength(4);
  });

  it("rejects empty meals array (forces AI failure → template fallback)", () => {
    expect(() => PlanResultSchema.parse({ summary: "kosong", meals: [] })).toThrow();
  });

  it("rejects too many meals (>8 — suspiciously long AI output)", () => {
    const meals = Array.from({ length: 9 }, (_, i) => ({
      meal_type: "snack" as const,
      name: `snack ${i}`,
      calories: 50,
    }));
    expect(() => PlanResultSchema.parse({ summary: "too long", meals })).toThrow();
  });

  it("rejects missing summary", () => {
    expect(() =>
      PlanResultSchema.parse({
        meals: [{ meal_type: "lunch", name: "x", calories: 100 }],
      }),
    ).toThrow();
  });

  it("rejects summary > 500 chars (DoS protection)", () => {
    expect(() =>
      PlanResultSchema.parse({
        summary: "x".repeat(501),
        meals: [{ meal_type: "lunch", name: "x", calories: 100 }],
      }),
    ).toThrow();
  });

  it("cascades meal validation errors", () => {
    expect(() =>
      PlanResultSchema.parse({
        summary: "valid",
        meals: [
          { meal_type: "lunch", name: "x", calories: 100 },
          { meal_type: "supper" as never, name: "bad", calories: 100 },
        ],
      }),
    ).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// adaptTemplateMeals — normalizes Json column to PlanMeal[]
// ──────────────────────────────────────────────────────────────────────────
describe("adaptTemplateMeals", () => {
  it("returns [] for non-array input", () => {
    expect(adaptTemplateMeals(null)).toEqual([]);
    expect(adaptTemplateMeals(undefined)).toEqual([]);
    expect(adaptTemplateMeals("not an array")).toEqual([]);
    expect(adaptTemplateMeals({ meals: [] })).toEqual([]); // object, not array
  });

  it("returns [] for empty array", () => {
    expect(adaptTemplateMeals([])).toEqual([]);
  });

  it("adapts a well-formed template meal", () => {
    const out = adaptTemplateMeals([
      { meal_type: "breakfast", name: "Nasi goreng", calories: 450 },
    ]);
    expect(out).toEqual([
      {
        meal_type: "breakfast",
        name: "Nasi goreng",
        calories: 450,
        planned_qty: 1,
        reason: "Rekomendasi template (AI tidak tersedia)",
      },
    ]);
  });

  it("skips entries with invalid meal_type", () => {
    const out = adaptTemplateMeals([
      { meal_type: "breakfast", name: "valid", calories: 200 },
      { meal_type: "supper", name: "invalid type", calories: 200 },
      { meal_type: "lunch", name: "valid", calories: 400 },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((m) => m.name)).toEqual(["valid", "valid"]);
  });

  it("skips entries with missing name", () => {
    const out = adaptTemplateMeals([
      { meal_type: "lunch", calories: 200 }, // missing name
      { meal_type: "lunch", name: "ada", calories: 300 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("ada");
  });

  it("skips entries with empty name", () => {
    const out = adaptTemplateMeals([{ meal_type: "lunch", name: "", calories: 200 }]);
    expect(out).toEqual([]);
  });

  it("skips entries with non-numeric calories", () => {
    const out = adaptTemplateMeals([
      { meal_type: "lunch", name: "x", calories: "200" },
      { meal_type: "lunch", name: "x", calories: null },
      { meal_type: "lunch", name: "x", calories: undefined },
    ]);
    expect(out).toEqual([]);
  });

  it("skips entries with negative calories", () => {
    const out = adaptTemplateMeals([{ meal_type: "lunch", name: "x", calories: -10 }]);
    expect(out).toEqual([]);
  });

  it("skips non-object entries (null, primitives)", () => {
    const out = adaptTemplateMeals([
      null,
      "string",
      42,
      true,
      { meal_type: "lunch", name: "valid", calories: 100 },
    ]);
    expect(out).toHaveLength(1);
  });

  it("handles a realistic Indonesian template (3 meals)", () => {
    const out = adaptTemplateMeals([
      { meal_type: "breakfast", name: "Bubur ayam", calories: 350 },
      { meal_type: "lunch", name: "Nasi + rendang + sayur", calories: 650 },
      { meal_type: "dinner", name: "Ikan bakar + lalapan", calories: 480 },
    ]);
    expect(out).toHaveLength(3);
    expect(out.reduce((s, m) => s + m.calories, 0)).toBe(1480);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// isUsablePlan — gates AI success vs template fallback
// ──────────────────────────────────────────────────────────────────────────
describe("isUsablePlan", () => {
  it("returns true for plan with ≥1 meal", () => {
    expect(isUsablePlan({ meals: [{ meal_type: "lunch", name: "x", calories: 100 }] })).toBe(true);
  });

  it("returns false for plan with empty meals (→ trigger template fallback)", () => {
    expect(isUsablePlan({ meals: [] })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isUsablePlan(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isUsablePlan(undefined)).toBe(false);
  });

  it("returns false when meals is missing", () => {
    expect(isUsablePlan({} as { meals: unknown[] })).toBe(false);
  });

  it("returns false when meals is not an array", () => {
    expect(isUsablePlan({ meals: "not array" } as unknown as { meals: unknown[] })).toBe(false);
  });

  // This is the critical "happy path" for the fallback feature: when AI returns
  // empty/invalid (the fallback from callAiJsonWithSchema), we MUST treat it as
  // unusable so the template path kicks in.
  it("isUsablePlan(fallback={summary:'', meals:[]}) === false (enables template path)", () => {
    expect(isUsablePlan({ meals: [] } as { meals: unknown[] })).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Integration scenarios — exercise the production schemas end-to-end
// ──────────────────────────────────────────────────────────────────────────
describe("integration: AI → PlanResult → isUsablePlan", () => {
  it("valid AI output passes through isUsablePlan", () => {
    const aiOutput = {
      summary: "Rencana makan diabetes + hipertensi",
      meals: [
        { meal_type: "breakfast", name: "Oatmeal + pisang", calories: 300 },
        { meal_type: "lunch", name: "Nasi merah + ikan", calories: 550 },
      ],
    };
    const parsed = PlanResultSchema.parse(aiOutput);
    expect(isUsablePlan(parsed)).toBe(true);
  });

  it("AI output wrapped in prose still extracts via callAiJsonWithSchema — but raw here would fail", () => {
    // callAiJsonWithSchema handles prose extraction internally. Our schema
    // is post-extract, so raw prose should reject (this is the contract).
    const proseWrapped =
      'Berikut rekomendasinya: {"summary":"x","meals":[{"meal_type":"lunch","name":"a","calories":100}]}';
    // Note: extractJsonFromResponse is what strips prose. We test that the
    // extracted payload validates correctly:
    const jsonMatch = proseWrapped.match(/\{.*\}/s);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const parsed = PlanResultSchema.parse(extracted);
    expect(parsed.meals).toHaveLength(1);
  });
});
