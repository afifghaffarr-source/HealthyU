/**
 * Unit tests for Sprint 5a (re-introduced 2026-06-20) Meal Plan refactor:
 * - Zod schemas (`PlanMealSchema`, `PlanResultSchema`) — LENIENT: accept AI aliases
 *   (verified against real gpt-oss-120b response shape: `type` vs `meal_type`,
 *   `notes` vs `reason`, missing `planned_qty`)
 * - `adaptTemplateMeals` — pure helper that normalizes `meal_plan_templates.meals`
 * - `isUsablePlan` — gate that decides AI success vs template fallback signal
 */
import { describe, expect, it } from "vitest";
import {
  PlanMealSchema,
  PlanResultSchema,
  adaptTemplateMeals,
  isUsablePlan,
} from "@/features/recommendations/lib/recommendations.functions";

// ──────────────────────────────────────────────────────────────────────────
// PlanMealSchema — single-meal validation (strict mode)
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
    expect(parsed.protein_g).toBe(25);
  });

  it("accepts a minimal meal (only required fields) and applies defaults", () => {
    const parsed = PlanMealSchema.parse({
      meal_type: "snack",
      name: "Yogurt",
      calories: 150,
    });
    expect(parsed.planned_qty).toBe(1);
    expect(parsed.reason).toBe("");
    expect(parsed.protein_g).toBeUndefined();
  });

  it("rejects unknown meal_type", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "supper", name: "x", calories: 100 })).toThrow();
  });

  it("rejects negative or absurd calories", () => {
    expect(() => PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: -50 })).toThrow();
    expect(() => PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: 6000 })).toThrow();
  });

  it("rejects planned_qty out of range", () => {
    expect(() =>
      PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: 100, planned_qty: 0 }),
    ).toThrow();
    expect(() =>
      PlanMealSchema.parse({ meal_type: "lunch", name: "x", calories: 100, planned_qty: 25 }),
    ).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PlanResultSchema — AI response shape (strict mode)
// ──────────────────────────────────────────────────────────────────────────
describe("PlanResultSchema", () => {
  it("accepts a valid result with multiple meals", () => {
    const parsed = PlanResultSchema.parse({
      summary: "Rekomendasi sehat untuk sisa hari ini",
      meals: [
        { meal_type: "breakfast", name: "Nasi goreng", calories: 400 },
        { meal_type: "lunch", name: "Ayam bakar", calories: 500 },
      ],
    });
    expect(parsed.meals).toHaveLength(2);
    expect(parsed.summary).toContain("sehat");
  });

  it("rejects empty meals array", () => {
    expect(() => PlanResultSchema.parse({ summary: "x", meals: [] })).toThrow();
  });

  it("rejects more than 8 meals", () => {
    const meals = Array.from({ length: 9 }, (_, i) => ({
      meal_type: "snack" as const,
      name: `Snack ${i}`,
      calories: 100,
    }));
    expect(() => PlanResultSchema.parse({ summary: "x", meals })).toThrow();
  });

  it("rejects missing summary", () => {
    expect(() =>
      PlanResultSchema.parse({ meals: [{ meal_type: "lunch", name: "x", calories: 100 }] }),
    ).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Sprint 5a (2026-06-20): LENIENT schema — accept AI aliases.
// Real gpt-oss-120b response shape (verified 2026-06-20):
//   - `type: "Breakfast"` instead of `meal_type: "breakfast"`
//   - `notes: "..."` instead of `reason: "..."`
//   - missing `planned_qty` (default to 1)
// Without the preprocess, every AI response failed validation, the fallback
// was triggered, and the user always saw "AI tidak tersedia".
// ──────────────────────────────────────────────────────────────────────────
describe("PlanMealSchema — AI alias tolerance", () => {
  it("accepts `type` as alias for `meal_type` (case-insensitive)", () => {
    const parsed = PlanMealSchema.parse({
      type: "Breakfast",
      name: "Oatmeal",
      calories: 300,
    });
    expect(parsed.meal_type).toBe("breakfast");
    expect(parsed.name).toBe("Oatmeal");
  });

  it("accepts `notes` as alias for `reason`", () => {
    const parsed = PlanMealSchema.parse({
      meal_type: "lunch",
      name: "Salad",
      calories: 250,
      notes: "Low carb, high fiber",
    });
    expect(parsed.reason).toBe("Low carb, high fiber");
  });

  it("defaults planned_qty to 1 when missing", () => {
    const parsed = PlanMealSchema.parse({
      meal_type: "snack",
      name: "Yogurt",
      calories: 150,
    });
    expect(parsed.planned_qty).toBe(1);
  });

  it("normalizes a real AI response shape (full integration)", () => {
    const parsed = PlanMealSchema.parse({
      type: "Dinner",
      name: "Tofu Scramble",
      calories: 320,
      protein_g: 28,
      carbs_g: 12,
      fat_g: 16,
      notes: "High protein, low glycemic",
    });
    expect(parsed.meal_type).toBe("dinner");
    expect(parsed.reason).toBe("High protein, low glycemic");
    expect(parsed.planned_qty).toBe(1);
    expect(parsed.protein_g).toBe(28);
  });

  it("rejects unknown meal_type even after lowercasing", () => {
    expect(() => PlanMealSchema.parse({ type: "supper", name: "x", calories: 100 })).toThrow();
  });
});

describe("PlanResultSchema — AI alias tolerance", () => {
  it("accepts a real gpt-oss-120b response (full integration)", () => {
    const raw = {
      meals: [
        {
          type: "Breakfast",
          name: "Tofu Scramble",
          calories: 320,
          protein_g: 28,
          carbs_g: 12,
          fat_g: 16,
          notes: "High protein",
        },
        {
          type: "Lunch",
          name: "Kacang Salad",
          calories: 420,
          protein_g: 30,
          carbs_g: 30,
          fat_g: 18,
          notes: "Steamed mung beans",
        },
        {
          type: "Dinner",
          name: "Gado-Gado",
          calories: 460,
          protein_g: 32,
          carbs_g: 38,
          fat_g: 18,
          notes: "Mixed blanched veggies",
        },
      ],
      summary: "Menu vegetarian, high-protein, diabetes-friendly. Total 1200 kcal.",
    };
    const parsed = PlanResultSchema.parse(raw);
    expect(parsed.meals).toHaveLength(3);
    expect(parsed.meals[0].meal_type).toBe("breakfast");
    expect(parsed.meals[0].reason).toBe("High protein");
    expect(parsed.meals[1].meal_type).toBe("lunch");
    expect(parsed.summary).toContain("diabetes-friendly");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// adaptTemplateMeals — Supabase Json → PlanMeal[]
// ──────────────────────────────────────────────────────────────────────────
describe("adaptTemplateMeals", () => {
  it("returns empty array for non-array input", () => {
    expect(adaptTemplateMeals(null)).toEqual([]);
    expect(adaptTemplateMeals(undefined)).toEqual([]);
    expect(adaptTemplateMeals({})).toEqual([]);
    expect(adaptTemplateMeals("not an array")).toEqual([]);
  });

  it("normalizes a valid template row", () => {
    const result = adaptTemplateMeals([
      { meal_type: "breakfast", name: "Bubur ayam", calories: 350 },
      { meal_type: "lunch", name: "Nasi padang", calories: 650 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      meal_type: "breakfast",
      name: "Bubur ayam",
      calories: 350,
      planned_qty: 1,
      reason: "Rekomendasi template (AI tidak tersedia)",
    });
  });

  it("filters out invalid entries silently", () => {
    const result = adaptTemplateMeals([
      { meal_type: "breakfast", name: "OK", calories: 100 },
      { meal_type: "supper", name: "Invalid meal_type", calories: 100 },
      { meal_type: "lunch", name: "", calories: 100 },
      { meal_type: "dinner", name: "Negative cals", calories: -50 },
      null,
      "string",
      { meal_type: "snack", name: "Yogurt", calories: 80 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("OK");
    expect(result[1].name).toBe("Yogurt");
  });

  it("always sets planned_qty=1 and the template reason", () => {
    const result = adaptTemplateMeals([{ meal_type: "lunch", name: "Test", calories: 200 }]);
    expect(result[0].planned_qty).toBe(1);
    expect(result[0].reason).toMatch(/template/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// isUsablePlan — gate for AI success
// ──────────────────────────────────────────────────────────────────────────
describe("isUsablePlan", () => {
  it("returns true for non-empty meals array", () => {
    expect(
      isUsablePlan({ summary: "ok", meals: [{ meal_type: "lunch", name: "x", calories: 100 }] }),
    ).toBe(true);
  });

  it("returns false for empty meals array", () => {
    expect(isUsablePlan({ summary: "ok", meals: [] })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isUsablePlan(null)).toBe(false);
    expect(isUsablePlan(undefined)).toBe(false);
  });

  it("returns false for missing meals field", () => {
    expect(isUsablePlan({ summary: "ok" } as never)).toBe(false);
  });
});
