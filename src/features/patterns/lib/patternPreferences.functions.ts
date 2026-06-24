/**
 * Pattern Preferences Server Functions
 * Sprint 10c Phase 1 - Custom Thresholds
 */

import { createServerFn } from "@tanstack/react-start";
import type { PatternSensitivity } from "../types/preferences";
import type { PatternCategory } from "../types/pattern";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Get user's pattern preferences (with defaults)
 */
export const getUserPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prefs, error } = await supabase
      .from("user_pattern_preferences")
      .select("*")
      .eq("user_id", data.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found (expected for first-time users)
      throw error;
    }

    // Return defaults if no preferences exist
    if (!prefs) {
      return {
        user_id: data.userId,
        sensitivity: "medium" as PatternSensitivity,
        enabled_categories: [
          "time",
          "emotional",
          "social",
          "cravings",
          "schedule",
          "location",
          "hunger",
        ] as PatternCategory[],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return {
      user_id: prefs.user_id,
      sensitivity: prefs.sensitivity as PatternSensitivity,
      enabled_categories: (prefs.enabled_categories || []) as PatternCategory[],
      created_at: prefs.created_at,
      updated_at: prefs.updated_at,
    };
  });

/**
 * Update user's pattern preferences
 */
export const updateUserPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      userId: string;
      sensitivity?: PatternSensitivity;
      enabled_categories?: PatternCategory[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (data.sensitivity) {
      updateData.sensitivity = data.sensitivity;
    }

    if (data.enabled_categories) {
      updateData.enabled_categories = data.enabled_categories;
    }

    const { data: updated, error } = await supabase
      .from("user_pattern_preferences")
      .upsert(updateData, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    return {
      user_id: updated.user_id,
      sensitivity: updated.sensitivity as PatternSensitivity,
      enabled_categories: (updated.enabled_categories || []) as PatternCategory[],
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  });
