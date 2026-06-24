/**
 * Craving Pattern Detection Rules
 *
 * Detects patterns related to food cravings:
 * - sugar_crashes: High carbs (>60%) → eat again <2h, 3+x/week
 * - specific_food_triggers: Same high-cal food >5x in 14 days
 * - night_cravings: Sweet/savory after 9pm, 3+x/week
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogWithMacros {
  log_date: string;
  logged_at: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  food_name?: string;
}

/**
 * Detect sugar crash pattern
 * Threshold: 3+ instances of high-carb meal followed by another meal <2h later (adjusted by sensitivity)
 */
export function detectSugarCrashes(
  meals: MealLogWithMacros[],
  sensitivity: number = 1.0,
): DetectedPattern {
  // Sort by time
  const sorted = [...meals].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );

  const crashes: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const meal = sorted[i];
    const nextMeal = sorted[i + 1];

    // Calculate carb percentage
    const totalGrams = meal.carbs_g + meal.protein_g + meal.fat_g;
    const carbPercent = totalGrams > 0 ? (meal.carbs_g / totalGrams) * 100 : 0;

    // Check if high carb (>60%)
    if (carbPercent < 60) continue;

    // Check time difference
    const timeDiff = new Date(nextMeal.logged_at).getTime() - new Date(meal.logged_at).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      crashes.push(meal.log_date);
    }
  }

  const threshold = Math.max(2, Math.ceil(3 / sensitivity));

  return {
    type: "sugar_crashes",
    count: crashes.length,
    detected: crashes.length >= threshold,
    avg_carbs:
      meals.length > 0
        ? Math.round(meals.reduce((sum, m) => sum + m.carbs_g, 0) / meals.length)
        : 0,
    matched_dates: Array.from(new Set(crashes)),
    metadata: {
      pattern: "high_carb_then_eat_again_soon",
      threshold_carb_percent: 60,
      threshold_hours: 2,
      threshold_applied: threshold,
    },
  };
}

/**
 * Detect specific food trigger pattern
 * Threshold: Same high-cal food (>500 kcal) appears >5x in 14 days (adjusted by sensitivity)
 */
export function detectSpecificFoodTriggers(
  meals: MealLogWithMacros[],
  sensitivity: number = 1.0,
): DetectedPattern {
  // Count food occurrences (high cal only)
  const foodCounts: Record<string, { count: number; dates: string[]; avgCal: number }> = {};

  meals.forEach((m) => {
    if (!m.food_name || m.calories < 500) return;

    const key = m.food_name.toLowerCase().trim();
    if (!foodCounts[key]) {
      foodCounts[key] = { count: 0, dates: [], avgCal: 0 };
    }
    foodCounts[key].count++;
    foodCounts[key].dates.push(m.log_date);
    foodCounts[key].avgCal += m.calories;
  });

  // Finalize averages
  Object.keys(foodCounts).forEach((key) => {
    foodCounts[key].avgCal = Math.round(foodCounts[key].avgCal / foodCounts[key].count);
  });

  // Find triggers (>threshold occurrences)
  const threshold = Math.max(3, Math.ceil(5 / sensitivity));
  const triggers = Object.entries(foodCounts).filter(([_, data]) => data.count > threshold);

  if (triggers.length === 0) {
    return {
      type: "specific_food_triggers",
      count: 0,
      detected: false,
      matched_dates: [],
      metadata: { no_triggers_found: true },
    };
  }

  // Get the most frequent trigger
  const topTrigger = triggers.sort((a, b) => b[1].count - a[1].count)[0];

  return {
    type: "specific_food_triggers",
    count: topTrigger[1].count,
    detected: true,
    avg_calories: topTrigger[1].avgCal,
    matched_dates: Array.from(new Set(topTrigger[1].dates)),
    metadata: {
      trigger_food: topTrigger[0],
      all_triggers: triggers.map(([food, data]) => ({
        food,
        count: data.count,
        avg_calories: data.avgCal,
      })),
    },
  };
}

/**
 * Detect night craving pattern
 * Threshold: Sweet/savory foods after 9pm, 3+x/week (adjusted by sensitivity)
 */
export function detectNightCravings(
  meals: MealLogWithMacros[],
  sensitivity: number = 1.0,
): DetectedPattern {
  const nightMeals = meals.filter((m) => {
    const hour = new Date(m.logged_at).getHours();
    return hour >= 21 || hour < 4; // 9pm-4am
  });

  const avgCalories =
    nightMeals.length > 0
      ? Math.round(nightMeals.reduce((sum, m) => sum + m.calories, 0) / nightMeals.length)
      : 0;

  const threshold = Math.max(2, Math.ceil(3 / sensitivity));

  return {
    type: "night_cravings",
    count: nightMeals.length,
    detected: nightMeals.length >= threshold,
    avg_calories: avgCalories,
    matched_dates: nightMeals.map((m) => m.log_date),
    metadata: {
      time_window: "9pm-4am",
      threshold_applied: threshold,
      night_meals: nightMeals.map((m) => ({
        date: m.log_date,
        time: m.logged_at,
        calories: m.calories,
      })),
    },
  };
}

/**
 * Run all craving pattern detections
 */
export function detectCravingPatterns(
  meals: MealLogWithMacros[],
  sensitivity: number = 1.0,
): DetectedPattern[] {
  return [
    detectSugarCrashes(meals, sensitivity),
    detectSpecificFoodTriggers(meals, sensitivity),
    detectNightCravings(meals, sensitivity),
  ].filter((p) => p.detected);
}
