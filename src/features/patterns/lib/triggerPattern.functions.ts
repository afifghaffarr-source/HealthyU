import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { triggerIfNeeded } from "./triggerDetection";
import { safeLogServerError } from "@/lib/logSafe";

/**
 * Check and trigger pattern detection if 24h passed
 * Called from dashboard loader (lazy trigger)
 *
 * KV removed — cooldown now in Supabase (free tier KV at 100%)
 */
export const checkPatternTrigger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    try {
      const result = await triggerIfNeeded(userId, supabase);
      return { checked: true, ...result };
    } catch (err) {
      safeLogServerError("dashboard.pattern-trigger", err).catch(() => {});
      return { checked: false, reason: "error" };
    }
  });
