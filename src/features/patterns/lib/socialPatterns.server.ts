/**
 * Social Pattern Detection Rules
 *
 * Detects patterns related to social contexts:
 * - gathering_overeat: Restaurant/cafe + >1000 kcal, 2+x
 * - peer_pressure: Group locations + larger portions than usual
 * - weekend_splurge: Weekend calories 30%+ higher than weekday avg
 */

import type { DetectedPattern } from "../types/pattern";

export interface MealLogWithLocation {
  log_date: string;
  calories: number;
  location_name: string | null;
}

/**
 * Detect gathering overeat pattern
 * Threshold: 2+ meals at restaurants/cafes with >1000 kcal (adjusted by sensitivity)
 */
export function detectGatheringOvereat(
  meals: MealLogWithLocation[],
  sensitivity: number = 1.0,
): DetectedPattern {
  const socialKeywords =
    /resto|restaurant|cafe|kafe|kedai|rumah makan|warteg|buffet|pesta|party|acara/i;

  const gatheringMeals = meals.filter(
    (m) => m.location_name && socialKeywords.test(m.location_name) && m.calories > 1000,
  );

  const avgCalories =
    gatheringMeals.length > 0
      ? Math.round(gatheringMeals.reduce((sum, m) => sum + m.calories, 0) / gatheringMeals.length)
      : 0;

  const threshold = Math.max(2, Math.ceil(2 / sensitivity));

  return {
    type: "gathering_overeat",
    count: gatheringMeals.length,
    detected: gatheringMeals.length >= threshold,
    avg_calories: avgCalories,
    matched_dates: gatheringMeals.map((m) => m.log_date),
    metadata: {
      locations: gatheringMeals.map((m) => m.location_name).filter(Boolean),
      high_cal_threshold: 1000,
      threshold_applied: threshold,
    },
  };
}

/**
 * Detect peer pressure eating pattern
 * Threshold: 3+ meals at social locations with calories >20% above personal avg (adjusted by sensitivity)
 */
export function detectPeerPressure(
  meals: MealLogWithLocation[],
  sensitivity: number = 1.0,
): DetectedPattern {
  // Calculate personal average calories
  const avgCalories =
    meals.length > 0 ? meals.reduce((sum, m) => sum + m.calories, 0) / meals.length : 600;

  const socialKeywords = /warung|kantin|cafe|resto|dengan|teman|keluarga|bersama/i;
  const threshold_multiplier = 1.2 / Math.sqrt(sensitivity); // Adjust threshold by sensitivity
  const calThreshold = avgCalories * threshold_multiplier;

  const peerMeals = meals.filter(
    (m) => m.location_name && socialKeywords.test(m.location_name) && m.calories > calThreshold,
  );

  const detectionThreshold = Math.max(2, Math.ceil(3 / sensitivity));

  return {
    type: "peer_pressure",
    count: peerMeals.length,
    detected: peerMeals.length >= detectionThreshold,
    avg_calories: Math.round(
      peerMeals.reduce((sum, m) => sum + m.calories, 0) / (peerMeals.length || 1),
    ),
    matched_dates: peerMeals.map((m) => m.log_date),
    metadata: {
      personal_avg_calories: Math.round(avgCalories),
      threshold_calories: Math.round(calThreshold),
      threshold_applied: detectionThreshold,
      locations: peerMeals.map((m) => m.location_name).filter(Boolean),
    },
  };
}

/**
 * Detect weekend splurge pattern
 * Threshold: Weekend avg calories 30%+ higher than weekday avg (adjusted by sensitivity)
 */
export function detectWeekendSplurge(
  meals: MealLogWithLocation[],
  sensitivity: number = 1.0,
): DetectedPattern {
  // Separate weekday vs weekend meals
  const weekdayMeals: MealLogWithLocation[] = [];
  const weekendMeals: MealLogWithLocation[] = [];

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
      type: "weekend_splurge",
      count: 0,
      detected: false,
      matched_dates: [],
      metadata: { insufficient_data: true },
    };
  }

  const weekdayAvg = weekdayMeals.reduce((sum, m) => sum + m.calories, 0) / weekdayMeals.length;
  const weekendAvg = weekendMeals.reduce((sum, m) => sum + m.calories, 0) / weekendMeals.length;

  const percentIncrease = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;

  // Adjust threshold by sensitivity (lower sensitivity = need bigger gap)
  const thresholdPercent = 30 / sensitivity;

  return {
    type: "weekend_splurge",
    count: percentIncrease >= thresholdPercent ? 1 : 0,
    detected: percentIncrease >= thresholdPercent,
    avg_calories: Math.round(weekendAvg),
    matched_dates: Array.from(new Set(weekendMeals.map((m) => m.log_date))),
    metadata: {
      weekday_avg: Math.round(weekdayAvg),
      weekend_avg: Math.round(weekendAvg),
      percent_increase: Math.round(percentIncrease),
      threshold_applied: Math.round(thresholdPercent),
    },
  };
}

/**
 * Run all social pattern detections
 */
export function detectSocialPatterns(
  meals: MealLogWithLocation[],
  sensitivity: number = 1.0,
): DetectedPattern[] {
  return [
    detectGatheringOvereat(meals, sensitivity),
    detectPeerPressure(meals, sensitivity),
    detectWeekendSplurge(meals, sensitivity),
  ].filter((p) => p.detected);
}
