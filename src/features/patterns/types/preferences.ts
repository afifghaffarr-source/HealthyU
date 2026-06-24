/**
 * Pattern Preferences Types
 * Sprint 10c Phase 1 - Custom Thresholds
 */

import type { PatternCategory } from "./pattern";

export type PatternSensitivity = "low" | "medium" | "high";

export interface PatternPreferences {
  user_id: string;
  sensitivity: PatternSensitivity;
  enabled_categories: PatternCategory[];
  created_at: string;
  updated_at: string;
}

/**
 * Sensitivity multipliers for pattern detection rules
 * - Low: stricter (only obvious patterns)
 * - Medium: default behavior
 * - High: more sensitive (catch subtle patterns)
 */
export const SENSITIVITY_MULTIPLIERS: Record<
  PatternSensitivity,
  {
    frequency: number; // multiplier for occurrence thresholds
    threshold: number; // multiplier for value thresholds (calories, etc)
  }
> = {
  low: {
    frequency: 0.67, // require 33% fewer occurrences to flag
    threshold: 1.2, // require 20% higher values to flag
  },
  medium: {
    frequency: 1.0,
    threshold: 1.0,
  },
  high: {
    frequency: 1.5, // flag with 50% more occurrences
    threshold: 0.8, // flag with 20% lower values
  },
};
