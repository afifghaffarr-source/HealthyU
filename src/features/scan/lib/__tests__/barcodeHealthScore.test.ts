import { describe, it, expect } from "vitest";
import {
  extractNutriments,
  scoreBarcodeProduct,
  type NormalizedNutriments,
} from "@/features/scan/lib/barcodeHealthScore";

/**
 * Sprint 27 — Barcode Health Score Indonesia tests.
 *
 * Locks the Nutritrack-style grading algorithm. Negative tests guard against
 * the axisScore division by zero / NaN propagation that bit earlier scoring
 * helpers. Specification set kept small but load-bearing.
 */

const clean: NormalizedNutriments = {
  caloriesPer100g: 120,
  sugarPer100g: 2,
  saturatedFatPer100g: 0.5,
  sodiumPer100g: 0.1,
  proteinPer100g: 15,
  fiberPer100g: 8,
};

const junk: NormalizedNutriments = {
  caloriesPer100g: 560,
  sugarPer100g: 35,
  saturatedFatPer100g: 16,
  sodiumPer100g: 1.4,
  proteinPer100g: 0,
  fiberPer100g: 0.1,
};

describe("extractNutriments — tolerates messy OFF payload", () => {
  it("reads standard _100g keys", () => {
    const out = extractNutriments({
      "energy-kcal_100g": 250,
      sugars_100g: 12,
      "saturated-fat_100g": 3,
      sodium_100g: 0.5,
      proteins_100g: 8,
      fiber_100g: 2,
    });
    expect(out).toEqual({
      caloriesPer100g: 250,
      sugarPer100g: 12,
      saturatedFatPer100g: 3,
      sodiumPer100g: 0.5,
      proteinPer100g: 8,
      fiberPer100g: 2,
    });
  });

  it("falls back to _value suffix", () => {
    const out = extractNutriments({
      "energy-kcal_100g_value": 320,
      sugars_value: 8,
    });
    expect(out.caloriesPer100g).toBe(320);
    expect(out.sugarPer100g).toBe(8);
  });

  it("converts salt_100g → sodium (×0.4 industry standard)", () => {
    const out = extractNutriments({ salt_100g: 1.0 });
    expect(out.sodiumPer100g).toBeCloseTo(0.4, 3);
  });

  it("prefers explicit sodium_100g over derived salt", () => {
    const out = extractNutriments({ sodium_100g: 0.7, salt_100g: 5.0 });
    expect(out.sodiumPer100g).toBe(0.7);
  });

  it("parses locale-flavoured comma decimals", () => {
    const out = extractNutriments({ "energy-kcal_100g": "250,5" });
    expect(out.caloriesPer100g).toBe(250.5);
  });

  it("treats garbage strings as null (not NaN)", () => {
    const out = extractNutriments({ "energy-kcal_100g": "abc", sugars_100g: "def" });
    expect(out.caloriesPer100g).toBeNull();
    expect(out.sugarPer100g).toBeNull();
  });

  it("handles completely absent payload", () => {
    const out = extractNutriments({});
    expect(out.caloriesPer100g).toBeNull();
    expect(out.proteinPer100g).toBeNull();
  });

  it("handles null payload", () => {
    const out = extractNutriments(null);
    expect(out.caloriesPer100g).toBeNull();
  });
});

describe("scoreBarcodeProduct — Indonesian Nutritrack grade", () => {
  it("clean product → grade A", () => {
    const r = scoreBarcodeProduct(clean);
    expect(r.grade).toBe("A");
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.reliable).toBe(true);
  });

  it("junk product → grade E", () => {
    const r = scoreBarcodeProduct(junk);
    expect(r.grade).toBe("E");
    expect(r.score).toBeLessThan(20);
    expect(r.reasons).toEqual(
      expect.arrayContaining([
        "Gula tinggi",
        "Lemak jenuh tinggi",
        "Sodium tinggi",
        "Kalori padat per 100g",
      ]),
    );
  });

  it("produces all 6 factor labels", () => {
    expect(scoreBarcodeProduct(clean).factors.map((f) => f.label)).toEqual([
      "Kalori",
      "Gula",
      "Lemak jenuh",
      "Sodium",
      "Protein",
      "Serat",
    ]);
  });

  it("clone of clean product gets grade A reproducibly", () => {
    const r1 = scoreBarcodeProduct(clean);
    const r2 = scoreBarcodeProduct(clean);
    expect(r1.grade).toBe(r2.grade);
    expect(r1.score).toBe(r2.score);
  });

  it("below-threshold junk food still gets readable grade (not zero + crash)", () => {
    const r = scoreBarcodeProduct(junk);
    expect(r.score).toBeGreaterThan(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it("missing nutrient list → flagged unreliable, no grade crash", () => {
    const r = scoreBarcodeProduct({
      caloriesPer100g: 200,
      sugarPer100g: null,
      saturatedFatPer100g: null,
      sodiumPer100g: null,
      proteinPer100g: null,
      fiberPer100g: null,
    });
    expect(r.reliable).toBe(false);
    expect(["A", "B", "C", "D", "E"]).toContain(r.grade);
  });

  it("accepts raw OFF payload directly (alias)", () => {
    const r = scoreBarcodeProduct({
      "energy-kcal_100g": 120,
      sugars_100g: 2,
      "saturated-fat_100g": 0.5,
      sodium_100g: 0.1,
      proteins_100g: 15,
      fiber_100g: 8,
    });
    expect(r.grade).toBe("A");
  });

  it("does not crash on all-NaN payload", () => {
    const r = scoreBarcodeProduct({
      caloriesPer100g: NaN,
      sugarPer100g: NaN,
      saturatedFatPer100g: NaN,
      sodiumPer100g: NaN,
      proteinPer100g: NaN,
      fiberPer100g: NaN,
    });
    expect(["A", "B", "C", "D", "E"]).toContain(r.grade);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("bonus axes (protein, fiber) push score UP not used as penalty", () => {
    const r1 = scoreBarcodeProduct({
      caloriesPer100g: 200,
      sugarPer100g: 5,
      saturatedFatPer100g: 2,
      sodiumPer100g: 0.3,
      proteinPer100g: null,
      fiberPer100g: null,
    });
    const r2 = scoreBarcodeProduct({
      caloriesPer100g: 200,
      sugarPer100g: 5,
      saturatedFatPer100g: 2,
      sodiumPer100g: 0.3,
      proteinPer100g: 20,
      fiberPer100g: 10,
    });
    expect(r2.score).toBeGreaterThan(r1.score);
  });

  it("score is clamped to 0..100", () => {
    const r = scoreBarcodeProduct(junk);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
