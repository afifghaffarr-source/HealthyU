import { describe, it, expect } from "vitest";
import {
  mapAdjustedToLogItems,
  estimateMacros,
  detectWarungMealType,
  type WarungAdjustedItem,
} from "@/features/scan/lib/warungSave";

/**
 * Sprint 22 — AI Warung Mode wiring tests.
 *
 * Locks the mapping contract between the UI (PostScanAdjuster) and the
 * server fn (logMealWithItems). If anyone breaks the precedence rules
 * (verified > AI > zero), CI catches it before users see weird "0 gram
 * protein" entries.
 */
const baseItem: WarungAdjustedItem = {
  name: "Ayam Goreng",
  canonical_name: "Ayam Goreng",
  est_calories: 250,
  est_protein_g: 25,
  est_carbs_g: 8,
  est_fat_g: 14,
  est_portion_g: 100,
  food_item_id: null,
  verified_nutrition: null,
  adjusted_portion_g: 80,
  adjusted_calories: 200,
};

describe("estimateMacros", () => {
  it("uses verified_nutrition when present (scaled by adjusted portion)", () => {
    const item: WarungAdjustedItem = {
      ...baseItem,
      adjusted_portion_g: 150, // 1.5x serving
      verified_nutrition: {
        // per serving of 100g
        calories: 250,
        protein_g: 25,
        carbs_g: 0,
        fat_g: 12,
        fiber_g: 0,
        serving_size: 100,
        serving_unit: "g",
      },
    };
    expect(estimateMacros(item)).toEqual({ protein_g: 37.5, carbs_g: 0, fat_g: 18 });
  });

  it("falls back to scaled AI estimates when no verified nutrition", () => {
    // Adjusted portion (80g) is 0.8x of est_portion_g (100g) → macros = 0.8x
    expect(estimateMacros(baseItem)).toEqual({
      protein_g: 20,
      carbs_g: 6.4,
      fat_g: 11.2,
    });
  });

  it("returns zeros (not NaN) when no nutrition info exists", () => {
    const minimal: WarungAdjustedItem = {
      ...baseItem,
      est_calories: undefined,
      est_protein_g: undefined,
      est_carbs_g: undefined,
      est_fat_g: undefined,
      est_portion_g: undefined,
      adjusted_portion_g: 100,
    };
    expect(estimateMacros(minimal)).toEqual({ protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it("guards against zero base-portion (no division by zero)", () => {
    const weird: WarungAdjustedItem = {
      ...baseItem,
      est_portion_g: 0,
      verified_nutrition: undefined,
    };
    expect(estimateMacros(weird)).toEqual({ protein_g: 25, carbs_g: 8, fat_g: 14 });
  });
});

describe("mapAdjustedToLogItems", () => {
  it("uses canonical_name when available", () => {
    const out = mapAdjustedToLogItems([
      { ...baseItem, name: "ayam_goreng_img_3", canonical_name: "Ayam Goreng" },
    ]);
    expect(out[0].food_name).toBe("Ayam Goreng");
  });

  it("falls back to plain name when canonical_name missing", () => {
    const out = mapAdjustedToLogItems([{ ...baseItem, canonical_name: undefined }]);
    expect(out[0].food_name).toBe("Ayam Goreng");
  });

  it("coerces numeric food_item_id to uuid string (Supabase schema)", () => {
    const out = mapAdjustedToLogItems([{ ...baseItem, food_item_id: 12345 }]);
    expect(out[0].food_item_id).toBe("12345");
  });

  it("preserves uuid-shaped food_item_id strings", () => {
    const out = mapAdjustedToLogItems([
      { ...baseItem, food_item_id: "550e8400-e29b-41d4-a716-446655440000" },
    ]);
    expect(out[0].food_item_id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("computes serving_qty from adjusted portion ÷ verified serving size", () => {
    const item: WarungAdjustedItem = {
      ...baseItem,
      adjusted_portion_g: 150,
      verified_nutrition: {
        calories: 250,
        protein_g: 25,
        carbs_g: 0,
        fat_g: 12,
        fiber_g: 0,
        serving_size: 100,
        serving_unit: "g",
      },
    };
    expect(mapAdjustedToLogItems([item])[0].serving_qty).toBe(1.5);
  });

  it("rounds calories to int and clamps to 0 minimum", () => {
    const negative: WarungAdjustedItem = { ...baseItem, adjusted_calories: -50 };
    const out = mapAdjustedToLogItems([negative]);
    expect(out[0].calories).toBe(0);
  });

  it("truncates food_name longer than 120 chars at the DB limit", () => {
    const long = "X".repeat(200);
    const out = mapAdjustedToLogItems([{ ...baseItem, name: long, canonical_name: long }]);
    expect(out[0].food_name.length).toBe(120);
  });

  it("returns empty array when input empty (caller's job to short-circuit)", () => {
    expect(mapAdjustedToLogItems([])).toEqual([]);
  });
});

describe("detectWarungMealType", () => {
  it("classifies breakfast keywords as breakfast", () => {
    expect(
      detectWarungMealType([
        { ...baseItem, canonical_name: "Nasi Uduk", name: "Nasi Uduk" },
        { ...baseItem, canonical_name: "Telur Dadar" },
      ]),
    ).toBe("breakfast");
  });

  it("classifies gorengan/snack keywords as snack", () => {
    expect(
      detectWarungMealType([{ ...baseItem, canonical_name: "Bakwan", name: "Bakwan Goreng" }]),
    ).toBe("snack");
  });

  it("defaults to lunch when ambiguous (typical warung-makan-tengah-hari scenario)", () => {
    expect(
      detectWarungMealType([
        { ...baseItem, canonical_name: "Nasi Putih" },
        { ...baseItem, canonical_name: "Ayam Goreng" },
        { ...baseItem, canonical_name: "Sayur Asem" },
      ]),
    ).toBe("lunch");
  });
});
