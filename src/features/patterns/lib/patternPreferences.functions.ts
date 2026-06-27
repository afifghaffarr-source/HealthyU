/**
 * Pattern Preferences Server Functions
 * Sprint 11 / Option A — custom thresholds via profiles.pattern_preferences JSONB
 *
 * ponytail: zero new tables; stores prefs as JSONB column on profiles.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PatternSensitivity = "low" | "medium" | "high";

export interface PatternPreferences {
  skip_breakfast_threshold: number;
  late_night_hour: number;
  irregular_meals_variance: number;
  sensitivity: PatternSensitivity;
}

export const DEFAULT_PREFERENCES: PatternPreferences = {
  skip_breakfast_threshold: 3,
  late_night_hour: 22,
  irregular_meals_variance: 2,
  sensitivity: "medium",
};

export function parsePreferences(raw: unknown): PatternPreferences {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCES;
  const obj = raw as Record<string, unknown>;
  return {
    skip_breakfast_threshold:
      typeof obj.skip_breakfast_threshold === "number" &&
      obj.skip_breakfast_threshold >= 2 &&
      obj.skip_breakfast_threshold <= 5
        ? obj.skip_breakfast_threshold
        : DEFAULT_PREFERENCES.skip_breakfast_threshold,
    late_night_hour:
      typeof obj.late_night_hour === "number" &&
      obj.late_night_hour >= 20 &&
      obj.late_night_hour <= 24
        ? obj.late_night_hour
        : DEFAULT_PREFERENCES.late_night_hour,
    irregular_meals_variance:
      typeof obj.irregular_meals_variance === "number" &&
      obj.irregular_meals_variance >= 1 &&
      obj.irregular_meals_variance <= 4
        ? obj.irregular_meals_variance
        : DEFAULT_PREFERENCES.irregular_meals_variance,
    sensitivity:
      obj.sensitivity === "low" || obj.sensitivity === "medium" || obj.sensitivity === "high"
        ? obj.sensitivity
        : DEFAULT_PREFERENCES.sensitivity,
  };
}

export const getPatternPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("pattern_preferences")
      .eq("id", userId)
      .single();

    return parsePreferences(profile?.pattern_preferences);
  });

export const updatePatternPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: PatternPreferences) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("profiles")
      .update({ pattern_preferences: data })
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  });
