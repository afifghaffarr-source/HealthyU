import { describe, it, expect, vi, afterEach } from "vitest";
import {
  bmi,
  bmiCategory,
  idealWeightRange,
  bmr,
  tdee,
  calorieTarget,
  macros,
  waterTargetMl,
  ageFromBirthDate,
  healthScore,
  streakDays,
} from "../localCalc";

describe("localCalc", () => {
  it("bmi guards zero inputs", () => {
    expect(bmi(0, 175)).toBe(0);
    expect(bmi(70, 0)).toBe(0);
    expect(bmi(70, 175)).toBe(22.9);
  });
  it("bmiCategory enum", () => {
    expect(bmiCategory(17)).toBe("underweight");
    expect(bmiCategory(22)).toBe("normal");
    expect(bmiCategory(27)).toBe("overweight");
    expect(bmiCategory(31)).toBe("obese");
  });
  it("idealWeightRange", () => {
    const r = idealWeightRange(175);
    expect(r.min).toBeCloseTo(56.7, 1);
    expect(r.max).toBeCloseTo(76.3, 1);
  });
  it("bmr male/female + ID gender terms", () => {
    expect(bmr({ weightKg: 70, heightCm: 175, ageYears: 25, gender: "male" })).toBe(1674);
    expect(bmr({ weightKg: 70, heightCm: 175, ageYears: 25, gender: "laki-laki" })).toBe(1674);
    expect(bmr({ weightKg: 60, heightCm: 165, ageYears: 30, gender: "female" })).toBe(1320);
    expect(bmr({ weightKg: 0, heightCm: 175, ageYears: 25 })).toBe(0);
  });
  it("tdee defaults to sedentary on unknown", () => {
    expect(tdee(1500, "unknown" as never)).toBe(1800);
    expect(tdee(1500, "athlete")).toBe(2850);
  });
  it("calorieTarget floors at 1200 for lose", () => {
    expect(calorieTarget(1500, "lose")).toBe(1200);
    expect(calorieTarget(2000, "lose")).toBe(1500);
    expect(calorieTarget(2000, "gain")).toBe(2300);
    expect(calorieTarget(2000)).toBe(2000);
  });
  it("macros 30/40/30", () => {
    const m = macros(2000);
    expect(m.protein_g).toBe(150);
    expect(m.carbs_g).toBe(200);
    expect(m.fat_g).toBe(67);
  });
  it("waterTargetMl adds 500ml at moderate+", () => {
    expect(waterTargetMl(0)).toBe(2000);
    expect(waterTargetMl(70, "sedentary")).toBe(2450);
    expect(waterTargetMl(70, "moderate")).toBe(2950);
    expect(waterTargetMl(70, "athlete")).toBe(2950);
  });
  it("ageFromBirthDate handles invalid/null", () => {
    expect(ageFromBirthDate(null)).toBe(0);
    expect(ageFromBirthDate("invalid")).toBe(0);
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    d.setDate(d.getDate() - 5);
    expect(ageFromBirthDate(d)).toBe(30);
  });
  it("healthScore 0..100", () => {
    expect(healthScore({})).toBe(0);
    const max = healthScore({
      bmi: 22,
      steps: 12000,
      sleepHours: 8,
      waterMl: 2500,
      waterTargetMl: 2500,
    });
    expect(max).toBe(100);
    const partial = healthScore({ bmi: 28, steps: 7000, sleepHours: 6 });
    expect(partial).toBe(10 + 15 + 12);
  });

  describe("streakDays", () => {
    afterEach(() => vi.useRealTimers());
    it("returns 0 for empty list", () => {
      expect(streakDays([])).toBe(0);
    });
    it("counts consecutive days ending today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
      expect(streakDays(["2026-06-05", "2026-06-04", "2026-06-03"])).toBe(3);
      expect(streakDays(["2026-06-05", "2026-06-03"])).toBe(1); // gap
      expect(streakDays(["2026-06-04"])).toBe(0); // doesn't include today
    });
  });
});