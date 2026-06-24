/**
 * Emotional Pattern Detection Rules
 *
 * Detects patterns related to mood and emotions:
 * - stress_eating: mood_before ≤2 + high calories (>600), 3+x
 * - mood_binges: Low mood → high calories → mood stays low
 * - celebration_overeat: mood_before ≥4 + >800 kcal, 2+x/week
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogWithMood {
  log_date: string;
  logged_at: string;
  calories: number;
  mood_before: number | null;
  mood_after: number | null;
}

/**
 * Detect stress eating pattern
 * Threshold: 3+ meals with mood_before ≤2 and calories >600
 */
export function detectStressEating(meals: MealLogWithMood[]): DetectedPattern {
  const stressMeals = meals.filter(
    (m) => m.mood_before !== null && m.mood_before <= 2 && m.calories > 600,
  );

  const avgCalories =
    stressMeals.length > 0
      ? Math.round(stressMeals.reduce((sum, m) => sum + m.calories, 0) / stressMeals.length)
      : 0;

  const avgMoodBefore =
    stressMeals.length > 0
      ? Math.round(
          (stressMeals.reduce((sum, m) => sum + (m.mood_before || 0), 0) / stressMeals.length) * 10,
        ) / 10
      : 0;

  return {
    type: "stress_eating",
    count: stressMeals.length,
    detected: stressMeals.length >= 3,
    avg_calories: avgCalories,
    matched_dates: stressMeals.map((m) => m.log_date),
    metadata: {
      avg_mood_before: avgMoodBefore,
      high_cal_threshold: 600,
      stress_meals: stressMeals.map((m) => ({
        date: m.log_date,
        mood_before: m.mood_before,
        calories: m.calories,
      })),
    },
  };
}

/**
 * Detect mood binge pattern
 * Threshold: 3+ meals where low mood → high cal → mood doesn't improve
 */
export function detectMoodBinges(meals: MealLogWithMood[]): DetectedPattern {
  const bingeMeals = meals.filter(
    (m) =>
      m.mood_before !== null &&
      m.mood_after !== null &&
      m.mood_before <= 2 &&
      m.calories > 700 &&
      (m.mood_after <= m.mood_before || m.mood_after <= 2),
  );

  const avgCalories =
    bingeMeals.length > 0
      ? Math.round(bingeMeals.reduce((sum, m) => sum + m.calories, 0) / bingeMeals.length)
      : 0;

  return {
    type: "mood_binges",
    count: bingeMeals.length,
    detected: bingeMeals.length >= 3,
    avg_calories: avgCalories,
    matched_dates: bingeMeals.map((m) => m.log_date),
    metadata: {
      pattern: "low_mood_before + high_cal + mood_stays_low",
      binge_meals: bingeMeals.map((m) => ({
        date: m.log_date,
        mood_before: m.mood_before,
        mood_after: m.mood_after,
        calories: m.calories,
      })),
    },
  };
}

/**
 * Detect celebration overeat pattern
 * Threshold: 2+ meals with mood_before ≥4 (happy) and calories >800
 */
export function detectCelebrationOvereat(meals: MealLogWithMood[]): DetectedPattern {
  const celebrationMeals = meals.filter(
    (m) => m.mood_before !== null && m.mood_before >= 4 && m.calories > 800,
  );

  const avgCalories =
    celebrationMeals.length > 0
      ? Math.round(
          celebrationMeals.reduce((sum, m) => sum + m.calories, 0) / celebrationMeals.length,
        )
      : 0;

  return {
    type: "celebration_overeat",
    count: celebrationMeals.length,
    detected: celebrationMeals.length >= 2,
    avg_calories: avgCalories,
    matched_dates: celebrationMeals.map((m) => m.log_date),
    metadata: {
      pattern: "happy_mood + high_calories",
      celebration_meals: celebrationMeals.map((m) => ({
        date: m.log_date,
        mood_before: m.mood_before,
        calories: m.calories,
      })),
    },
  };
}

/**
 * Run all emotional pattern detections
 */
export function detectEmotionalPatterns(meals: MealLogWithMood[]): DetectedPattern[] {
  return [
    detectStressEating(meals),
    detectMoodBinges(meals),
    detectCelebrationOvereat(meals),
  ].filter((p) => p.detected);
}
