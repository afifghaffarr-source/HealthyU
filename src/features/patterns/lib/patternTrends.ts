/**
 * Pattern Trend Calculation
 *
 * ponytail: use existing occurrence_count + baseline_count
 * No new tables/migrations needed
 */

import type { PatternInsight } from "../types/pattern";

export interface PatternTrend {
  improvementPercent: number; // -100 to +100 (negative = worse, positive = better)
  status: "improving" | "stable" | "worsening";
  daysTracked: number;
}

/**
 * Calculate improvement trend for a pattern
 */
export function calculateTrend(pattern: PatternInsight): PatternTrend {
  const { occurrence_count, baseline_count, detected_at } = pattern;

  // Improvement = (baseline - current) / baseline * 100
  // Example: baseline=10, current=3 → (10-3)/10*100 = 70% improvement
  const improvementPercent =
    baseline_count > 0 ? ((baseline_count - occurrence_count) / baseline_count) * 100 : 0;

  // Status thresholds
  let status: PatternTrend["status"];
  if (improvementPercent >= 20) {
    status = "improving"; // 20%+ better
  } else if (improvementPercent <= -20) {
    status = "worsening"; // 20%+ worse
  } else {
    status = "stable"; // Between -20% and +20%
  }

  // Days tracked = days since first detected
  const daysTracked = Math.floor(
    (Date.now() - new Date(detected_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    improvementPercent: Math.round(improvementPercent),
    status,
    daysTracked,
  };
}

/**
 * Get trend emoji for UI
 */
export function getTrendEmoji(status: PatternTrend["status"]): string {
  switch (status) {
    case "improving":
      return "📈";
    case "worsening":
      return "📉";
    case "stable":
      return "➡️";
  }
}

/**
 * Get trend color for UI
 */
export function getTrendColor(status: PatternTrend["status"]): string {
  switch (status) {
    case "improving":
      return "text-green-600";
    case "worsening":
      return "text-red-600";
    case "stable":
      return "text-gray-600";
  }
}
