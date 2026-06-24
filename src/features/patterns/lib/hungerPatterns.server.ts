/**
 * Hunger/Satiety Pattern Detection Rules
 *
 * Detects patterns related to hunger and fullness signals:
 * - eating_not_hungry: hunger_before ≤2 but eat >500 kcal, 3+x/week
 * - ignoring_fullness: hunger_after ≥4 (stuffed), 3+x
 * - hunger_disconnect: Hunger signals inconsistent with eating behavior
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogHunger {
  log_date: string;
  calories: number;
  hunger_level_before: number | null;
  hunger_level_after: number | null;
}

/**
 * Detect eating when not hungry pattern
 * Threshold: 3+ meals with hunger_before ≤2 and calories >500
 */
export function detectEatingNotHungry(meals: MealLogHunger[]): DetectedPattern {
  const notHungryMeals = meals.filter(
    (m) => m.hunger_level_before !== null && m.hunger_level_before <= 2 && m.calories > 500,
  );

  const avgCalories =
    notHungryMeals.length > 0
      ? Math.round(notHungryMeals.reduce((sum, m) => sum + m.calories, 0) / notHungryMeals.length)
      : 0;

  const avgHungerBefore =
    notHungryMeals.length > 0
      ? Math.round(
          (notHungryMeals.reduce((sum, m) => sum + (m.hunger_level_before || 0), 0) /
            notHungryMeals.length) *
            10,
        ) / 10
      : 0;

  return {
    type: "eating_not_hungry",
    count: notHungryMeals.length,
    detected: notHungryMeals.length >= 3,
    avg_calories: avgCalories,
    matched_dates: notHungryMeals.map((m) => m.log_date),
    metadata: {
      avg_hunger_before: avgHungerBefore,
      threshold_hunger: 2,
      threshold_calories: 500,
      pattern: "low_hunger_but_high_calories",
    },
  };
}

/**
 * Detect ignoring fullness signals pattern
 * Threshold: 3+ meals with hunger_after ≥4 (overly full/stuffed)
 */
export function detectIgnoringFullness(meals: MealLogHunger[]): DetectedPattern {
  const overfullMeals = meals.filter(
    (m) => m.hunger_level_after !== null && m.hunger_level_after >= 4,
  );

  const avgCalories =
    overfullMeals.length > 0
      ? Math.round(overfullMeals.reduce((sum, m) => sum + m.calories, 0) / overfullMeals.length)
      : 0;

  const avgHungerAfter =
    overfullMeals.length > 0
      ? Math.round(
          (overfullMeals.reduce((sum, m) => sum + (m.hunger_level_after || 0), 0) /
            overfullMeals.length) *
            10,
        ) / 10
      : 0;

  return {
    type: "ignoring_fullness",
    count: overfullMeals.length,
    detected: overfullMeals.length >= 3,
    avg_calories: avgCalories,
    matched_dates: overfullMeals.map((m) => m.log_date),
    metadata: {
      avg_hunger_after: avgHungerAfter,
      threshold_hunger_after: 4,
      pattern: "eating_past_comfortable_fullness",
    },
  };
}

/**
 * Detect hunger disconnect pattern
 * Threshold: 3+ meals where hunger signals don't match behavior
 * (e.g., very hungry before but small meal, or not hungry but large meal)
 */
export function detectHungerDisconnect(meals: MealLogHunger[]): DetectedPattern {
  const disconnectMeals = meals.filter((m) => {
    if (m.hunger_level_before === null) return false;

    // Case 1: Very hungry (≥4) but small meal (<400 kcal)
    const hungrySmallMeal = m.hunger_level_before >= 4 && m.calories < 400;

    // Case 2: Not hungry (≤2) but large meal (>700 kcal)
    const notHungryLargeMeal = m.hunger_level_before <= 2 && m.calories > 700;

    return hungrySmallMeal || notHungryLargeMeal;
  });

  const avgCalories =
    disconnectMeals.length > 0
      ? Math.round(disconnectMeals.reduce((sum, m) => sum + m.calories, 0) / disconnectMeals.length)
      : 0;

  return {
    type: "hunger_disconnect",
    count: disconnectMeals.length,
    detected: disconnectMeals.length >= 3,
    avg_calories: avgCalories,
    matched_dates: disconnectMeals.map((m) => m.log_date),
    metadata: {
      pattern: "hunger_signals_mismatch_eating_behavior",
      cases: disconnectMeals.map((m) => ({
        date: m.log_date,
        hunger_before: m.hunger_level_before,
        calories: m.calories,
        type:
          m.hunger_level_before! >= 4 && m.calories < 400
            ? "very_hungry_small_meal"
            : "not_hungry_large_meal",
      })),
    },
  };
}

/**
 * Run all hunger/satiety pattern detections
 */
export function detectHungerPatterns(
  meals: MealLogHunger[],
  sensitivity: number = 1.0,
): DetectedPattern[] {
  return [
    detectEatingNotHungry(meals),
    detectIgnoringFullness(meals),
    detectHungerDisconnect(meals),
  ].filter((p) => p.detected);
}
