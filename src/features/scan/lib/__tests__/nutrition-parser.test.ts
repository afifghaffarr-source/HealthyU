/**
 * Tests for nutrition-parser — regex-based EN+ID label parser.
 *
 * Coverage:
 *   - Bahasa Indonesia label (Energi, Protein, Lemak, etc.)
 *   - English label (Calories, Total Fat, Sodium, etc.)
 *   - Unit conversions (kJ → kcal, mg → g, Garam → Sodium)
 *   - Edge cases: empty, malformed, multi-line, decimal comma
 *   - First-match-wins for duplicate fields
 *   - Confidence scoring accuracy
 *
 * Strategy: use real label text samples (no mocks — pure function).
 */

import { describe, it, expect } from "vitest";
import { parseNutritionLabel } from "@/features/scan/lib/nutrition-parser";

describe("parseNutritionLabel", () => {
  describe("Bahasa Indonesia labels", () => {
    it("parses standard Indonesian nutrition facts", () => {
      const text = `
        Informasi Nilai Gizi
        Takaran Saji: 30g
        Jumlah per sajian:
        Energi: 150 kkal
        Protein: 3g
        Karbohidrat: 25g
        Gula: 12g
        Lemak Total: 4g
        Lemak Jenuh: 1.5g
        Serat: 2g
        Natrium: 100mg
      `;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.servingSize).toBe("30g");
      expect(result.nutrition.calories).toBe(150);
      expect(result.nutrition.protein_g).toBe(3);
      expect(result.nutrition.carbs_g).toBe(25);
      expect(result.nutrition.sugar_g).toBe(12);
      expect(result.nutrition.fat_g).toBe(4);
      expect(result.nutrition.sat_fat_g).toBe(1.5);
      expect(result.nutrition.fiber_g).toBe(2);
      expect(result.nutrition.sodium_mg).toBe(100);
      expect(result.matchedFields).toBeGreaterThanOrEqual(8);
    });

    it("converts Garam (g) → Sodium (mg) with 0.4 factor", () => {
      const text = `
        Garam: 0.5g
      `;
      const result = parseNutritionLabel(text);
      // 0.5g salt × 1000 (to mg) × 0.4 (sodium fraction) = 200mg
      expect(result.nutrition.salt_g).toBe(0.5);
      expect(result.nutrition.sodium_mg).toBe(200);
    });

    it("parses Lemak Trans separately from Lemak Total", () => {
      const text = `
        Lemak Total: 10g
        Lemak Jenuh: 3g
        Lemak Trans: 0g
      `;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.fat_g).toBe(10);
      expect(result.nutrition.sat_fat_g).toBe(3);
      expect(result.nutrition.trans_fat_g).toBe(0);
    });

    it("handles Kolesterol (mg)", () => {
      const text = `
        Kolesterol: 15mg
        Natrium: 250mg
      `;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.cholesterol_mg).toBe(15);
      expect(result.nutrition.sodium_mg).toBe(250);
    });
  });

  describe("English labels", () => {
    it("parses US-style nutrition facts", () => {
      const text = `
        Serving Size: 1 bar (40g)
        Calories: 180
        Total Fat: 6g
        Saturated Fat: 2g
        Trans Fat: 0g
        Sodium: 95mg
        Total Carbohydrate: 28g
        Dietary Fiber: 4g
        Sugars: 12g
        Protein: 5g
      `;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.servingSize).toMatch(/1 bar/);
      expect(result.nutrition.calories).toBe(180);
      expect(result.nutrition.fat_g).toBe(6);
      expect(result.nutrition.sat_fat_g).toBe(2);
      expect(result.nutrition.trans_fat_g).toBe(0);
      expect(result.nutrition.sodium_mg).toBe(95);
      expect(result.nutrition.carbs_g).toBe(28);
      expect(result.nutrition.fiber_g).toBe(4);
      expect(result.nutrition.sugar_g).toBe(12);
      expect(result.nutrition.protein_g).toBe(5);
    });

    it("converts kJ to kcal (4.184 factor)", () => {
      const text = `Energy: 1046 kJ`;
      const result = parseNutritionLabel(text);
      // 1046 / 4.184 ≈ 250.0
      expect(result.nutrition.calories).toBe(250);
    });

    it("handles 'Incl. sugars' and 'Sugars' interchangeably", () => {
      const text = `Sugars: 8g\nIncl. sugars: 6g`;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.sugar_g).toBe(8); // first match wins
    });
  });

  describe("edge cases", () => {
    it("returns all nulls for empty input", () => {
      const result = parseNutritionLabel("");
      expect(result.matchedFields).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.nutrition.calories).toBeNull();
      expect(result.nutrition.protein_g).toBeNull();
    });

    it("handles EU decimal comma (1,5g)", () => {
      const text = `Lemak Jenuh: 1,5g`;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.sat_fat_g).toBe(1.5);
    });

    it("handles whitespace and extra newlines", () => {
      const text = "\n\n  Protein: 10g  \n\n  Lemak Total: 5g  \n\n";
      const result = parseNutritionLabel(text);
      expect(result.nutrition.protein_g).toBe(10);
      expect(result.nutrition.fat_g).toBe(5);
    });

    it("ignores unrelated text (e.g. ingredients list)", () => {
      const text = `
        Ingredients: wheat flour, sugar, palm oil, salt, yeast
        Contains: gluten, milk
        Energi: 200 kkal
        Protein: 4g
      `;
      const result = parseNutritionLabel(text);
      expect(result.nutrition.calories).toBe(200);
      expect(result.nutrition.protein_g).toBe(4);
    });

    it("caps confidence at 100", () => {
      // Build a label that exceeds normal weight sum
      const text = `
        Energi: 500 kkal
        Protein: 20g
        Karbohidrat: 60g
        Gula: 30g
        Lemak Total: 20g
        Lemak Jenuh: 8g
        Lemak Trans: 1g
        Serat: 5g
        Natrium: 400mg
        Kolesterol: 30mg
      `;
      const result = parseNutritionLabel(text);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.matchedFields).toBeGreaterThanOrEqual(9);
    });
  });

  describe("confidence scoring", () => {
    it("low confidence for partial labels (only 1-2 fields)", () => {
      const text = `Calories: 200`;
      const result = parseNutritionLabel(text);
      expect(result.confidence).toBeLessThan(30);
      expect(result.matchedFields).toBe(1);
    });

    it("high confidence for full labels (8+ fields)", () => {
      const text = `
        Energi: 250 kkal
        Protein: 5g
        Karbohidrat: 40g
        Gula: 15g
        Lemak Total: 8g
        Lemak Jenuh: 2g
        Serat: 3g
        Natrium: 200mg
      `;
      const result = parseNutritionLabel(text);
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.matchedFields).toBeGreaterThanOrEqual(7);
    });
  });
});
