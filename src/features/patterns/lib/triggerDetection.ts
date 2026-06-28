/**
 * Pattern Detection Trigger (On-Demand)
 *
 * ponytail: simplest solution that works
 * - Cooldown in Supabase (KV at 100% quota)
 * - Run detection if expired
 * - No cron needed
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logServerError } from "@/lib/logger.server";

/**
 * Check if we should run detection for this user
 * Uses Supabase instead of KV (free tier KV quota at 100%)
 */
export async function shouldRunDetection(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data } = await supabase
    .from("pattern_detection_cooldown")
    .select("last_detection_at")
    .eq("user_id", userId)
    .single();

  if (!data) return true; // Never run before

  const hoursSince = (Date.now() - new Date(data.last_detection_at).getTime()) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

/**
 * Mark detection as run (upsert into Supabase)
 */
export async function markDetectionRun(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  await supabase.from("pattern_detection_cooldown").upsert(
    {
      user_id: userId,
      last_detection_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Lazy trigger: run detection if needed
 * Call from dashboard loader or after meal log
 */
export async function triggerIfNeeded(
  userId: string,
  supabase: SupabaseClient<Database>,
  geminiKey?: string,
  forceRun = false,
): Promise<{ ran: boolean; patternsFound: number }> {
  const should = forceRun || (await shouldRunDetection(userId, supabase));
  if (!should) {
    return { ran: false, patternsFound: 0 };
  }

  try {
    // Import detection service
    const { detectPatternsForUser } = await import("../services/patternDetection.server");
    const result = await detectPatternsForUser(supabase, userId);

    await markDetectionRun(userId, supabase);
    return { ran: true, patternsFound: result.detected_count };
  } catch (error) {
    logServerError("trigger-detection", error);
    return { ran: false, patternsFound: 0 };
  }
}
