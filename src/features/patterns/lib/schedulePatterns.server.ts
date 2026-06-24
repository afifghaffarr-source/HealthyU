/**
 * Schedule Pattern Detection Rules
 *
 * Detects patterns related to schedule disruptions:
 * - busy_day_skips: <2 meals logged per day, 3+x/week
 * - rush_meals: Meals logged <10 min apart
 * - workday_weekend_gap: Weekday vs weekend eating patterns drastically different
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogSchedule {
  log_date: string;
  logged_at: string;
  calories: number;
}

/**
 * Detect busy day skip pattern
 * Threshold: 3+ days with <2 meals logged in 14 days
 */
export function detectBusyDaySkips(meals: MealLogSchedule[]): DetectedPattern {
  // Group by date
  const mealsByDate: Record<string, number> = {};
  meals.forEach((m) => {
    mealsByDate[m.log_date] = (mealsByDate[m.log_date] || 0) + 1;
  });

  // Find days with <2 meals
  const skipDays = Object.entries(mealsByDate)
    .filter(([_, count]) => count < 2)
    .map(([date, _]) => date);

  return {
    type: "busy_day_skips",
    count: skipDays.length,
    detected: skipDays.length >= 3,
    matched_dates: skipDays,
    metadata: {
      meals_by_date: mealsByDate,
      threshold_meals_per_day: 2,
    },
  };
}

/**
 * Detect rush meals pattern
 * Threshold: 3+ instances of meals <10 min apart
 */
export function detectRushMeals(meals: MealLogSchedule[]): DetectedPattern {
  const sorted = [...meals].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
  );

  const rushDates: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const timeDiff =
      new Date(sorted[i + 1].logged_at).getTime() - new Date(sorted[i].logged_at).getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 10) {
      rushDates.push(sorted[i].log_date);
    }
  }

  return {
    type: "rush_meals",
    count: rushDates.length,
    detected: rushDates.length >= 3,
    matched_dates: Array.from(new Set(rushDates)),
    metadata: {
      threshold_minutes: 10,
      pattern: "meals_logged_too_close_together",
    },
  };
}

/**
 * Detect workday vs weekend gap pattern
 * Threshold: Meal count or timing drastically different (>40% variance)
 */
export function detectWorkdayWeekendGap(meals: MealLogSchedule[]): DetectedPattern {
  const weekdayMeals: MealLogSchedule[] = [];
  const weekendMeals: MealLogSchedule[] = [];

  meals.forEach((m) => {
    const day = new Date(m.log_date).getDay();
    if (day === 0 || day === 6) {
      weekendMeals.push(m);
    } else {
      weekdayMeals.push(m);
    }
  });

  if (weekdayMeals.length === 0 || weekendMeals.length === 0) {
    return {
      type: "workday_weekend_gap",
      count: 0,
      detected: false,
      matched_dates: [],
      metadata: { insufficient_data: true },
    };
  }

  // Calculate unique days
  const weekdayDates = Array.from(new Set(weekdayMeals.map((m) => m.log_date)));
  const weekendDates = Array.from(new Set(weekendMeals.map((m) => m.log_date)));

  // Meals per day average
  const weekdayMealsPerDay = weekdayMeals.length / weekdayDates.length;
  const weekendMealsPerDay = weekendMeals.length / weekendDates.length;

  const diff = Math.abs(weekdayMealsPerDay - weekendMealsPerDay);
  const diffPercent = (diff / Math.max(weekdayMealsPerDay, weekendMealsPerDay)) * 100;

  return {
    type: "workday_weekend_gap",
    count: weekdayDates.length + weekendDates.length,
    detected: diffPercent >= 40,
    matched_dates: [...weekdayDates, ...weekendDates],
    metadata: {
      weekday_meals_per_day: Math.round(weekdayMealsPerDay * 10) / 10,
      weekend_meals_per_day: Math.round(weekendMealsPerDay * 10) / 10,
      diff_percent: Math.round(diffPercent),
    },
  };
}

/**
 * Run all schedule pattern detections
 */
export function detectSchedulePatterns(meals: MealLogSchedule[]): DetectedPattern[] {
  return [detectBusyDaySkips(meals), detectRushMeals(meals), detectWorkdayWeekendGap(meals)].filter(
    (p) => p.detected,
  );
}
