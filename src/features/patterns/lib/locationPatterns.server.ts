/**
 * Location Pattern Detection Rules
 *
 * Detects patterns related to eating locations:
 * - warung_overeat: Warung location + avg >700 kcal, 5+x
 * - home_vs_outside: Outside eating 40%+ higher calories than home
 * - workplace_cafeteria: Cafeteria + high carbs/fat, >5x/week
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogLocation {
  log_date: string;
  calories: number;
  carbs_g: number;
  fat_g: number;
  location_name: string | null;
}

/**
 * Detect warung overeat pattern
 * Threshold: 5+ meals at warung with avg >700 kcal
 */
export function detectWarungOvereat(meals: MealLogLocation[]): DetectedPattern {
  const warungKeywords = /warung|warteg|kaki lima|angkringan|tenda/i;

  const warungMeals = meals.filter((m) => m.location_name && warungKeywords.test(m.location_name));

  const avgCalories =
    warungMeals.length > 0
      ? Math.round(warungMeals.reduce((sum, m) => sum + m.calories, 0) / warungMeals.length)
      : 0;

  return {
    type: "warung_overeat",
    count: warungMeals.length,
    detected: warungMeals.length >= 5 && avgCalories > 700,
    avg_calories: avgCalories,
    matched_dates: warungMeals.map((m) => m.log_date),
    metadata: {
      threshold_count: 5,
      threshold_calories: 700,
      locations: Array.from(new Set(warungMeals.map((m) => m.location_name).filter(Boolean))),
    },
  };
}

/**
 * Detect home vs outside eating gap
 * Threshold: Outside meals 40%+ higher calories than home meals
 */
export function detectHomeVsOutside(meals: MealLogLocation[]): DetectedPattern {
  const homeKeywords = /rumah|home|dapur/i;

  const homeMeals = meals.filter(
    (m) => !m.location_name || m.location_name.trim() === "" || homeKeywords.test(m.location_name),
  );

  const outsideMeals = meals.filter(
    (m) => m.location_name && m.location_name.trim() !== "" && !homeKeywords.test(m.location_name),
  );

  if (homeMeals.length === 0 || outsideMeals.length === 0) {
    return {
      type: "home_vs_outside",
      count: 0,
      detected: false,
      matched_dates: [],
      metadata: { insufficient_data: true },
    };
  }

  const homeAvg = homeMeals.reduce((sum, m) => sum + m.calories, 0) / homeMeals.length;
  const outsideAvg = outsideMeals.reduce((sum, m) => sum + m.calories, 0) / outsideMeals.length;

  const diff = outsideAvg - homeAvg;
  const diffPercent = (diff / homeAvg) * 100;

  return {
    type: "home_vs_outside",
    count: outsideMeals.length,
    detected: diffPercent >= 40,
    avg_calories: Math.round(outsideAvg),
    matched_dates: outsideMeals.map((m) => m.log_date),
    metadata: {
      home_avg: Math.round(homeAvg),
      outside_avg: Math.round(outsideAvg),
      diff_calories: Math.round(diff),
      diff_percent: Math.round(diffPercent),
    },
  };
}

/**
 * Detect workplace cafeteria pattern
 * Threshold: 5+ meals at kantin/cafeteria with high carbs (>65g) or fat (>25g)
 */
export function detectWorkplaceCafeteria(meals: MealLogLocation[]): DetectedPattern {
  const cafeteriaKeywords = /kantin|cafeteria|kantor|office/i;

  const cafeteriaMeals = meals.filter(
    (m) =>
      m.location_name &&
      cafeteriaKeywords.test(m.location_name) &&
      (m.carbs_g > 65 || m.fat_g > 25),
  );

  const avgCalories =
    cafeteriaMeals.length > 0
      ? Math.round(cafeteriaMeals.reduce((sum, m) => sum + m.calories, 0) / cafeteriaMeals.length)
      : 0;

  const avgCarbs =
    cafeteriaMeals.length > 0
      ? Math.round(cafeteriaMeals.reduce((sum, m) => sum + m.carbs_g, 0) / cafeteriaMeals.length)
      : 0;

  const avgFat =
    cafeteriaMeals.length > 0
      ? Math.round(cafeteriaMeals.reduce((sum, m) => sum + m.fat_g, 0) / cafeteriaMeals.length)
      : 0;

  return {
    type: "workplace_cafeteria",
    count: cafeteriaMeals.length,
    detected: cafeteriaMeals.length >= 5,
    avg_calories: avgCalories,
    avg_carbs: avgCarbs,
    matched_dates: cafeteriaMeals.map((m) => m.log_date),
    metadata: {
      avg_fat_g: avgFat,
      threshold_carbs_g: 65,
      threshold_fat_g: 25,
      locations: Array.from(new Set(cafeteriaMeals.map((m) => m.location_name).filter(Boolean))),
    },
  };
}

/**
 * Run all location pattern detections
 */
export function detectLocationPatterns(
  meals: MealLogLocation[],
  sensitivity: number = 1.0,
): DetectedPattern[] {
  return [
    detectWarungOvereat(meals),
    detectHomeVsOutside(meals),
    detectWorkplaceCafeteria(meals),
  ].filter((p) => p.detected);
}
