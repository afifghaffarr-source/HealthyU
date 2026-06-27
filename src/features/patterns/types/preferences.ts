/**
 * Pattern detection user preferences
 * Stored in profiles.pattern_preferences (JSONB)
 */

export type PatternSensitivity = "low" | "medium" | "high";

export interface PatternPreferences {
  /** Days threshold for skip breakfast detection (2-5) */
  skip_breakfast_threshold: number;
  /** Hour threshold for late night eating (20-24) */
  late_night_hour: number;
  /** Hour variance for irregular meals (1-4) */
  irregular_meals_variance: number;
  /** Overall sensitivity multiplier */
  sensitivity: PatternSensitivity;
}

export const DEFAULT_PATTERN_PREFERENCES: PatternPreferences = {
  skip_breakfast_threshold: 3,
  late_night_hour: 22,
  irregular_meals_variance: 2,
  sensitivity: "medium",
};

/**
 * Parse pattern_preferences from DB (JSONB)
 * Falls back to defaults if invalid/missing
 */
export function parsePatternPreferences(raw: unknown): PatternPreferences {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PATTERN_PREFERENCES;
  }

  const obj = raw as Record<string, unknown>;

  return {
    skip_breakfast_threshold:
      typeof obj.skip_breakfast_threshold === "number" &&
      obj.skip_breakfast_threshold >= 2 &&
      obj.skip_breakfast_threshold <= 5
        ? obj.skip_breakfast_threshold
        : DEFAULT_PATTERN_PREFERENCES.skip_breakfast_threshold,

    late_night_hour:
      typeof obj.late_night_hour === "number" &&
      obj.late_night_hour >= 20 &&
      obj.late_night_hour <= 24
        ? obj.late_night_hour
        : DEFAULT_PATTERN_PREFERENCES.late_night_hour,

    irregular_meals_variance:
      typeof obj.irregular_meals_variance === "number" &&
      obj.irregular_meals_variance >= 1 &&
      obj.irregular_meals_variance <= 4
        ? obj.irregular_meals_variance
        : DEFAULT_PATTERN_PREFERENCES.irregular_meals_variance,

    sensitivity:
      obj.sensitivity === "low" || obj.sensitivity === "medium" || obj.sensitivity === "high"
        ? obj.sensitivity
        : DEFAULT_PATTERN_PREFERENCES.sensitivity,
  };
}
