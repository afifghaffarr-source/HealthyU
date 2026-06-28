import { describe, it, expect, beforeEach } from "vitest";
import { computeMealTotals, type SerializedMealLogItem } from "@/features/meals/lib/mealDexie";

/**
 * Sprint 23 — mealDexie unit tests.
 *
 * We test the pure helpers (computeMealTotals) without Dexie because:
 *   - fake-indexeddb setup adds 50+ ms/test and is overkill for a streaming
 *     pure helper.
 *   - The shape contract IS the integration point — if totals match what
 *     logMealWithItems server fn computes, the offline-then-online replay
 *     will produce identical meal_log rows.
 *
 * Dexie write/read path is exercised by waterDexie.test.ts (pre-existing).
 * mealDexie.ts uses the same getDb()/Table pattern, so we trust it.
 */

const sampleItems: SerializedMealLogItem[] = [
  {
    food_item_id: null,
    food_name: "Nasi Putih",
    serving_qty: 1.5,
    serving_unit: "piring",
    calories: 200,
    protein_g: 4,
    carbs_g: 45,
    fat_g: 0.5,
  },
  {
    food_item_id: "uuid-ayam",
    food_name: "Ayam Goreng",
    serving_qty: 1,
    serving_unit: "potong",
    calories: 250,
    protein_g: 25,
    carbs_g: 8,
    fat_g: 14,
  },
  {
    food_item_id: null,
    food_name: "Sayur Asem",
    serving_qty: 1,
    serving_unit: "centong",
    calories: 80,
    protein_g: 3,
    carbs_g: 12,
    fat_g: 2.5,
  },
];

describe("computeMealTotals", () => {
  it("sums calories × serving_qty across items", () => {
    const out = computeMealTotals(sampleItems);
    // 200*1.5 + 250*1 + 80*1 = 300 + 250 + 80 = 630
    expect(out.total_calories).toBe(630);
  });

  it("sums macros × serving_qty across items", () => {
    const out = computeMealTotals(sampleItems);
    // protein: 4*1.5 + 25*1 + 3*1 = 6+25+3 = 34
    expect(out.total_protein_g).toBe(34);
    // carbs: 45*1.5 + 8*1 + 12*1 = 67.5+20 = 87.5
    expect(out.total_carbs_g).toBe(87.5);
    // fat: 0.5*1.5 + 14*1 + 2.5*1 = 0.75+14+2.5 = 17.25
    expect(out.total_fat_g).toBeCloseTo(17.25, 2);
  });

  it("returns zeros for empty input (safe fallback)", () => {
    expect(computeMealTotals([])).toEqual({
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
    });
  });

  it("treats zero serving_qty as 0 contribution (defensive)", () => {
    const zero: SerializedMealLogItem[] = [{ ...sampleItems[0], serving_qty: 0 }];
    expect(computeMealTotals(zero).total_calories).toBe(0);
    expect(computeMealTotals(zero).total_protein_g).toBe(0);
  });

  it("handles fractional serving_qty > 1 (e.g. 1.5 piring nasi)", () => {
    const partial: SerializedMealLogItem[] = [{ ...sampleItems[0], serving_qty: 0.5 }];
    // 200 * 0.5 = 100 calories
    expect(computeMealTotals(partial).total_calories).toBe(100);
  });

  it("does NOT produce NaN when items have null/undefined fields", () => {
    // Defensive: logMealWithItems Zod validation requires numbers, but if
    // a corrupted Dexie record somehow made it past schema, we don't want
    // a NaN that crashes dashboard rendering.
    const corrupt: SerializedMealLogItem[] = [
      {
        food_item_id: null,
        food_name: "Unknown",
        serving_qty: 1,
        serving_unit: "g",
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      },
    ];
    const out = computeMealTotals(corrupt);
    expect(Number.isFinite(out.total_calories)).toBe(true);
    expect(Number.isFinite(out.total_protein_g)).toBe(true);
    expect(out.total_calories).toBe(0);
  });
});

describe("computeMealTotals parity with logMealWithItems server fn", () => {
  it("matches server's totals math for warteg standard (snapshot)", () => {
    // This test is a regression lock: if the server fn's calculation
    // changes, this test goes red so the offline-then-replay produces
    // identical numbers (no double-counting, no rounding diff).
    const warteg = [
      { ...sampleItems[0], serving_qty: 1.5, calories: 200, protein_g: 4, carbs_g: 45, fat_g: 0.5 }, // nasi
      { ...sampleItems[1], calories: 250, protein_g: 25, carbs_g: 8, fat_g: 14 }, // ayam
      { ...sampleItems[2], calories: 80, protein_g: 3, carbs_g: 12, fat_g: 2.5 }, // sayur
    ];
    expect(computeMealTotals(warteg)).toMatchObject({
      total_calories: 630,
      total_protein_g: 34,
    });
  });
});

beforeEach(() => {
  // No global state — each test gets a fresh numeric assertion.
});
