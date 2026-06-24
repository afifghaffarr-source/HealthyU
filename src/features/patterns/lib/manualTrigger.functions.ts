/**
 * Manual Pattern Detection Trigger
 * Sprint 10c: Allow users to run detection on-demand
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { triggerIfNeeded } from "./triggerDetection";

/**
 * Force run pattern detection (bypass 24h cooldown)
 */
export const runPatternDetectionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Get current user from supabase client
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const result = await triggerIfNeeded(user.id, supabase, undefined, true);

    return {
      success: true,
      ran: result.ran,
      patternsFound: result.patternsFound,
    };
  });
