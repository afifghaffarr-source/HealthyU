import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { triggerIfNeeded } from "./triggerDetection";

/**
 * Check and trigger pattern detection if 24h passed
 * Called from dashboard loader (lazy trigger)
 */
export const checkPatternTrigger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    if (!context.cloudflare?.env?.HEALTHYU_KV) {
      return { checked: false, reason: "no_kv" };
    }

    try {
      const result = await triggerIfNeeded(userId, supabase, context.cloudflare.env.HEALTHYU_KV);
      return { checked: true, ...result };
    } catch (err) {
      console.error("[Dashboard] Pattern trigger check failed:", err);
      return { checked: false, reason: "error" };
    }
  });
