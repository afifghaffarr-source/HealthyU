/**
 * Pattern Detection Trigger (On-Demand)
 *
 * ponytail: simplest solution that works
 * - Check KV cache (24h TTL)
 * - Run detection if expired
 * - No cron needed
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Check if we should run detection for this user
 */
export async function shouldRunDetection(userId: string, kv: KVStore): Promise<boolean> {
  const lastRun = await kv.get(`pattern_last_run:${userId}`);
  if (!lastRun) return true;

  const hoursSince = (Date.now() - parseInt(lastRun, 10)) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

/**
 * Mark detection as run (cache for 24h)
 */
export async function markDetectionRun(userId: string, kv: KVStore): Promise<void> {
  await kv.put(`pattern_last_run:${userId}`, Date.now().toString(), {
    expirationTtl: 86400, // 24h
  });
}

/**
 * Lazy trigger: run detection if needed
 * Call from dashboard loader or after meal log
 */
export async function triggerIfNeeded(
  userId: string,
  supabase: SupabaseClient,
  kv: KVStore,
  geminiKey?: string,
): Promise<{ ran: boolean; patternsFound: number }> {
  const should = await shouldRunDetection(userId, kv);
  if (!should) {
    return { ran: false, patternsFound: 0 };
  }

  try {
    // Import detection service
    const { detectPatternsForUser } = await import("../services/patternDetection.server");
    const result = await detectPatternsForUser(supabase, userId);

    await markDetectionRun(userId, kv);
    return { ran: true, patternsFound: result.detected_count };
  } catch (err) {
    console.error("[Pattern Trigger] Failed:", err);
    return { ran: false, patternsFound: 0 };
  }
}
