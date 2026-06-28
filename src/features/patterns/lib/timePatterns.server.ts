/**
 * Time-based Pattern Detection Rules
 *
 * Detects patterns related to meal timing:
 * - skip_breakfast: <3 breakfasts in 5 weekdays
 * - late_night_eating: meals after 10pm, 3+x/week
 * - irregular_meals: meal time variance >3h day-to-day
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLog {
  log_date: string;
  logged_at: string;
  meal_type: string | null;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
}

/**
 * Detect skip breakfast pattern
 * Threshold: <N breakfasts in last 5 weekdays (adjusted by sensitivity)
 */
export function detectSkipBreakfast(
  meals: MealLog[],
  threshold: number = 3,
  sensitivity: number = 1.0,
  now?: Date,
): DetectedPattern {
  const currentDate = now ?? new Date();
  const fiveDaysAgo = new Date(currentDate.getTime() - 5 * 86400000);

  // Get last 5 weekdays
  const weekdays = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(currentDate.getTime() - i * 86400000);
    const day = d.getDay();
    if (day !== 0 && day !== 6) weekdays.push(d.toISOString().split("T")[0]);
    if (weekdays.length >= 5) break;
  }

  // Count breakfast logs in those days
  const breakfastDays = new Set(
    meals.filter((m) => m.meal_type === "breakfast").map((m) => m.log_date),
  );

  const breakfastCount = weekdays.filter((d) => breakfastDays.has(d)).length;
  const skippedDays = weekdays.filter((d) => !breakfastDays.has(d));

  return {
    type: "skip_breakfast",
    count: skippedDays.length,
    detected: skippedDays.length >= threshold,
    matched_dates: skippedDays,
    metadata: {
      weekdays_checked: weekdays,
      breakfast_count: breakfastCount,
      threshold_applied: threshold,
    },
  };
}

/**
 * Detect late-night eating pattern
 * Threshold: 3+ meals after configured hour in 14 days (adjusted by sensitivity)
 */
export function detectLateNightEating(
  meals: MealLog[],
  lateNightHour: number = 22,
  sensitivity: number = 1.0,
): DetectedPattern {
  const lateNightMeals = meals.filter((m) => {
    const hour = new Date(m.logged_at).getUTCHours();
    return hour >= lateNightHour || hour < 4; // configured hour-4am
  });

  const avgCalories =
    lateNightMeals.length > 0
      ? Math.round(lateNightMeals.reduce((sum, m) => sum + m.calories, 0) / lateNightMeals.length)
      : 0;

  const avgCarbs =
    lateNightMeals.length > 0
      ? Math.round(lateNightMeals.reduce((sum, m) => sum + m.carbs_g, 0) / lateNightMeals.length)
      : 0;

  // Apply sensitivity: low=4+, medium=3+, high=2+
  const threshold = Math.max(2, Math.ceil(3 / sensitivity));

  return {
    type: "late_night_eating",
    count: lateNightMeals.length,
    detected: lateNightMeals.length >= threshold,
    avg_calories: avgCalories,
    avg_carbs: avgCarbs,
    matched_dates: lateNightMeals.map((m) => m.log_date),
    metadata: {
      threshold_applied: threshold,
      late_night_meals: lateNightMeals.map((m) => ({
        date: m.log_date,
        time: m.logged_at,
        calories: m.calories,
      })),
    },
  };
}

/**
 * Detect irregular meal timing pattern
 * Threshold: meal times vary >N hours from day to day for same meal type
 */
export function detectIrregularMeals(
  meals: MealLog[],
  varianceThreshold: number = 2,
): DetectedPattern {
  // Group by meal_type
  const byType: Record<string, { date: string; hour: number }[]> = {};

  meals.forEach((m) => {
    if (!m.meal_type) return;
    const d = new Date(m.logged_at);
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (!byType[m.meal_type]) byType[m.meal_type] = [];
    byType[m.meal_type].push({ date: m.log_date, hour });
  });

  // Calculate variance for each meal type
  const irregularDates: string[] = [];
  let maxVariance = 0;

  Object.entries(byType).forEach(([type, entries]) => {
    if (entries.length < 3) return; // Need at least 3 samples

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Check consecutive day differences
    for (let i = 1; i < entries.length; i++) {
      const diff = Math.abs(entries[i].hour - entries[i - 1].hour);
      if (diff > varianceThreshold) {
        irregularDates.push(entries[i].date);
        maxVariance = Math.max(maxVariance, diff);
      }
    }
  });

  return {
    type: "irregular_meals",
    count: irregularDates.length,
    detected: irregularDates.length >= 2,
    matched_dates: Array.from(new Set(irregularDates)),
    metadata: {
      max_variance_hours: Math.round(maxVariance * 10) / 10,
      meal_types_checked: Object.keys(byType),
      variance_threshold_applied: varianceThreshold,
    },
  };
}

/**
 * Run all time-based pattern detections
 */
export function detectTimePatterns(
  meals: MealLog[],
  options: {
    skipBreakfastThreshold?: number;
    lateNightHour?: number;
    irregularVariance?: number;
    sensitivity?: number;
  } = {},
): DetectedPattern[] {
  const {
    skipBreakfastThreshold = 3,
    lateNightHour = 22,
    irregularVariance = 2,
    sensitivity = 1.0,
  } = options;

  return [
    detectSkipBreakfast(meals, skipBreakfastThreshold, sensitivity),
    detectLateNightEating(meals, lateNightHour, sensitivity),
    detectIrregularMeals(meals, irregularVariance),
  ].filter((p) => p.detected);
}
