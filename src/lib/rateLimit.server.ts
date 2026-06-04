import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-side rate limiter backed by `public.check_rate_limit` RPC.
 * Returns true if the request is allowed (and increments the bucket atomically).
 *
 * Use within server functions / server routes AFTER the user is authenticated,
 * passing the user-scoped `supabase` client so auth.uid() resolves correctly.
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  bucket: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _bucket: bucket,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rateLimit] RPC error:", error.message);
    // Fail-open on infra error to avoid blocking legit traffic, but log it.
    return true;
  }
  return data === true;
}

/** Common pre-configured buckets. Tune as needed. */
export const RATE_LIMITS = {
  chat: { bucket: "chat", max: 30, windowSec: 60 }, // 30 msg/min
  ai_scan: { bucket: "ai_scan", max: 20, windowSec: 3600 }, // 20 scans/hour
  ai_recipe: { bucket: "ai_recipe", max: 30, windowSec: 3600 },
  ai_coach: { bucket: "ai_coach", max: 20, windowSec: 3600 },
  report: { bucket: "report", max: 10, windowSec: 86400 }, // 10/day
  community: { bucket: "community", max: 60, windowSec: 3600 }, // 1/min avg
} as const;
