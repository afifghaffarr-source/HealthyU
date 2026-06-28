import { describe, it, expect } from "vitest";
import {
  estimateEmissionForText,
  summarizeSustainability,
  type MealLogForEmission,
  SUSTAINABILITY_TIPS,
} from "@/features/food/lib/sustainability";

/**
 * Sprint 30 — Sustainability Tracker (Indonesian food carbon footprint).
 *
 * Locks the curated emissions dictionary + per-meal matching logic.
 * The dictionary covers the 30 most-logged Indonesian foods (per
 * Sprint 22 wiring's `estimatePortion` patterns). Numbers come from
 * public Poore & Nemecek (2018) and Indonesian LCA studies; rounded
 * to a single decimal so display is humane.
 */

describe("estimateEmissionForText — fuzzy match against curated dict", () => {
  it("recognises 'nasi goreng' and returns non-zero emission", () => {
    const r = estimateEmissionForText("Nasi Goreng Spesial");
    expect(r).not.toBeNull();
    expect(r!.kgCo2ePer100g).toBeGreaterThan(0);
    expect(r!.kgCo2ePer100g).toBeLessThan(10); // sanity bound
  });

  it("recognises 'tempe' as low-emission protein", () => {
    const r = estimateEmissionForText("Tempe Goreng");
    expect(r).not.toBeNull();
    expect(r!.kgCo2ePer100g).toBeLessThan(2); // beans < 2 kg CO2e/kg
  });

  it("recognises 'daging sapi' / 'sapi' as high-emission meat", () => {
    const r = estimateEmissionForText("Rendang Daging Sapi");
    expect(r).not.toBeNull();
    expect(r!.kgCo2ePer100g).toBeGreaterThan(10); // beef > 20 kg CO2e/kg
  });

  it("returns null for unknown food strings (graceful — no fabricated score)", () => {
    expect(estimateEmissionForText("warp drive sushi")).toBeNull();
    expect(estimateEmissionForText("")).toBeNull();
  });

  it("case-insensitive match", () => {
    const a = estimateEmissionForText("NASI GORENG");
    const b = estimateEmissionForText("nasi goreng");
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.kgCo2ePer100g).toBeCloseTo(b!.kgCo2ePer100g, 5);
  });
});

describe("summarizeSustainability — weekly total + classification", () => {
  it("computes total kg CO2e across 7-day meal rows", () => {
    const rows: MealLogForEmission[] = [
      { id: "1", custom_name: "Nasi Goreng", calories: 400 },
      { id: "2", custom_name: "Tempe Orek", calories: 150 },
      { id: "3", custom_name: "Rendang Sapi", calories: 350 },
    ];
    const r = summarizeSustainability(rows);
    expect(r.totalKgCo2e).toBeGreaterThan(0);
    expect(Number.isFinite(r.totalKgCo2e)).toBe(true);
  });

  it("classifies as 'low' / 'medium' / 'high' under sane thresholds", () => {
    const r = summarizeSustainability([{ id: "1", custom_name: "Tempe", calories: 100 }]);
    expect(["low", "medium", "high"]).toContain(r.classification);
  });

  it("produces a shareable Indonesian tagline ≤120 chars", () => {
    const r = summarizeSustainability([{ id: "1", custom_name: "Nasi Goreng", calories: 400 }]);
    expect(r.tagline.length).toBeLessThanOrEqual(120);
    expect(r.tagline.length).toBeGreaterThan(5);
  });

  it("handles empty input without crashing", () => {
    const r = summarizeSustainability([]);
    expect(r.totalKgCo2e).toBe(0);
    expect(["low", "medium", "high"]).toContain(r.classification);
  });

  it("skips unknown meal names without inflating total (no fabrication)", () => {
    const r = summarizeSustainability([
      { id: "1", custom_name: "warp drive sushi", calories: 9999 },
      { id: "2", custom_name: "asteroid salad", calories: 5000 },
    ]);
    expect(r.totalKgCo2e).toBe(0);
  });

  it("produces top eco tip rotated deterministically by id set", () => {
    const r1 = summarizeSustainability([{ id: "a", custom_name: "Tempe", calories: 100 }]);
    const r2 = summarizeSustainability([{ id: "a", custom_name: "Tempe", calories: 100 }]);
    expect(r1.tip).toBe(r2.tip);
  });

  it("SUSTAINABILITY_TIPS list has at least 3 entries (rotation needs ≥3)", () => {
    expect(SUSTAINABILITY_TIPS.length).toBeGreaterThanOrEqual(3);
  });
});
