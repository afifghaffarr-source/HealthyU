import { describe, it, expect } from "vitest";
import {
  buildWeeklyShareCard,
  type WeeklyShareInputs,
} from "@/features/reports/lib/weeklyShareCard";

/**
 * Sprint 28 — Shareable Weekly Wrap-Up card derivation tests.
 *
 * Locks the pure-mapping contract between raw hydration/meal/workout logs
 * and the share-card payload. Server-fn then just queries DB and pipes the
 * result into this helper — no separate UI logic.
 */

const base: WeeklyShareInputs = {
  userName: "Andi",
  weekStart: "2025-06-23",
  weekEnd: "2025-06-29",
  totalCalories: 12450,
  totalProteinG: 580,
  totalCarbsG: 1500,
  totalFatG: 420,
  totalWaterMl: 11200,
  totalWorkoutMinutes: 245,
  daysActive: 6,
  daysInWeek: 7,
  longestStreakDays: 4,
  topMealLabel: "Nasi goreng",
  goalCaloriesPerDay: 2100,
};

describe("buildWeeklyShareCard — pure mapping", () => {
  it("computes daily averages rounded to whole numbers", () => {
    const c = buildWeeklyShareCard(base);
    expect(c.avgCaloriesPerDay).toBe(1779); // 12450/7 = 1778.57 → 1779
    expect(c.avgWaterMlPerDay).toBe(1600); // 11200/7 = 1600
    expect(c.avgWorkoutMinPerDay).toBe(35); // 245/7 = 35
  });

  it("computes calorie goal adherence as 0..100 (capped at 100)", () => {
    const low = buildWeeklyShareCard({ ...base, totalCalories: 9800 });
    expect(low.calorieGoalPct).toBe(67); // 9800/(2100*7)=66.66 → 67

    const exact = buildWeeklyShareCard({ ...base, totalCalories: 14700 });
    expect(exact.calorieGoalPct).toBe(100); // capped at 100

    const over = buildWeeklyShareCard({ ...base, totalCalories: 18000 });
    expect(over.calorieGoalPct).toBe(100);
  });

  it("computes activity score 0..100 from daysActive + workout minutes", () => {
    expect(
      buildWeeklyShareCard({ ...base, daysActive: 7, totalWorkoutMinutes: 420 }).activityScore,
    ).toBeGreaterThanOrEqual(90);
    expect(
      buildWeeklyShareCard({ ...base, daysActive: 1, totalWorkoutMinutes: 0 }).activityScore,
    ).toBeLessThan(30);
  });

  it("produces a localizable Indonesian headline based on the dominant axis", () => {
    const c = buildWeeklyShareCard(base);
    expect(typeof c.headline).toBe("string");
    expect(c.headline.length).toBeGreaterThan(5);
    expect(c.headline.length).toBeLessThan(80);
  });

  it("produces a short tagline for share messages (≤120 chars)", () => {
    const c = buildWeeklyShareCard(base);
    expect(c.shareTagline.length).toBeLessThanOrEqual(120);
    expect(c.shareTagline).toContain("Andi");
  });

  it("falls back gracefully when totalWaterMl=0 (sedentary users)", () => {
    const c = buildWeeklyShareCard({ ...base, totalWaterMl: 0 });
    expect(c.avgWaterMlPerDay).toBe(0);
    expect(Number.isFinite(c.activityScore)).toBe(true);
  });

  it("handles zero-day week without crashing", () => {
    const c = buildWeeklyShareCard({
      ...base,
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalWaterMl: 0,
      totalWorkoutMinutes: 0,
      daysActive: 0,
    });
    expect(c.avgCaloriesPerDay).toBe(0);
    expect(c.calorieGoalPct).toBe(0);
    expect(Number.isFinite(c.activityScore)).toBe(true);
  });

  it("identity-preserving: same inputs produce same output", () => {
    const a = buildWeeklyShareCard(base);
    const b = buildWeeklyShareCard(base);
    expect(a).toEqual(b);
  });

  it("week label is humanised Indonesian", () => {
    const c = buildWeeklyShareCard(base);
    expect(c.weekLabel).toContain("2025");
    expect(c.weekLabel.length).toBeGreaterThan(5);
  });

  it("reproducible headline class: dominant axis wins", () => {
    const cardioDominant = buildWeeklyShareCard({
      ...base,
      totalCalories: 9800,
      totalWorkoutMinutes: 600,
    });
    const calorieDominant = buildWeeklyShareCard({
      ...base,
      totalCalories: 16000,
      totalWorkoutMinutes: 60,
    });
    // Activity-vs-food headlines differ on dominant axis
    expect(cardioDominant.headline).not.toBe(calorieDominant.headline);
  });

  it("score numbers clamp 0..100 even when inputs are absurd", () => {
    const c = buildWeeklyShareCard({ ...base, totalCalories: 999999, totalWorkoutMinutes: 99999 });
    expect(c.calorieGoalPct).toBeLessThanOrEqual(100);
    expect(c.activityScore).toBeLessThanOrEqual(100);
    expect(c.activityScore).toBeGreaterThanOrEqual(0);
    expect(c.calorieGoalPct).toBeGreaterThanOrEqual(0);
  });
});
