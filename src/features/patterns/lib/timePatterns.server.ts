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
 * Threshold: <3 breakfasts in last 5 weekdays
 */
export function detectSkipBreakfast(meals: MealLog[]): DetectedPattern {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);

  // Get last 5 weekdays
  const weekdays = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() - i * 86400000);
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
    detected: skippedDays.length >= 3,
    matched_dates: skippedDays,
    metadata: {
      weekdays_checked: weekdays,
      breakfast_count: breakfastCount,
    },
  };
}

/**
 * Detect late-night eating pattern
 * Threshold: 3+ meals after 10pm in 14 days
 */
export function detectLateNightEating(meals: MealLog[]): DetectedPattern {
  const lateNightMeals = meals.filter((m) => {
    const hour = new Date(m.logged_at).getHours();
    return hour >= 22 || hour < 4; // 10pm-4am
  });

  const avgCalories =
    lateNightMeals.length > 0
      ? Math.round(lateNightMeals.reduce((sum, m) => sum + m.calories, 0) / lateNightMeals.length)
      : 0;

  const avgCarbs =
    lateNightMeals.length > 0
      ? Math.round(lateNightMeals.reduce((sum, m) => sum + m.carbs_g, 0) / lateNightMeals.length)
      : 0;

  return {
    type: "late_night_eating",
    count: lateNightMeals.length,
    detected: lateNightMeals.length >= 3,
    avg_calories: avgCalories,
    avg_carbs: avgCarbs,
    matched_dates: lateNightMeals.map((m) => m.log_date),
    metadata: {
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
 * Threshold: meal times vary >3h from day to day for same meal type
 */
export function detectIrregularMeals(meals: MealLog[]): DetectedPattern {
  // Group by meal_type
  const byType: Record<string, { date: string; hour: number }[]> = {};

  meals.forEach((m) => {
    if (!m.meal_type) return;
    const hour = new Date(m.logged_at).getHours() + new Date(m.logged_at).getMinutes() / 60;
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
      if (diff > 3) {
        irregularDates.push(entries[i].date);
        maxVariance = Math.max(maxVariance, diff);
      }
    }
  });

  return {
    type: "irregular_meals",
    count: irregularDates.length,
    detected: irregularDates.length >= 3,
    matched_dates: Array.from(new Set(irregularDates)),
    metadata: {
      max_variance_hours: Math.round(maxVariance * 10) / 10,
      meal_types_checked: Object.keys(byType),
    },
  };
}

/**
 * Run all time-based pattern detections
 */
export function detectTimePatterns(meals: MealLog[]): DetectedPattern[] {
  return [
    detectSkipBreakfast(meals),
    detectLateNightEating(meals),
    detectIrregularMeals(meals),
  ].filter((p) => p.detected);
}
