/**
 * Pattern Detection Trigger Logic
 *
 * Smart trigger: Run analysis when:
 * 1. User logs 3+ meals since last analysis, OR
 * 2. 24h passed since last analysis
 *
 * Cache result for 24h to avoid re-running on every page load
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface AnalysisCache {
  user_id: string;
  analyzed_at: string;
  cache_until: string;
  result: {
    detected_count: number;
    top_pattern: unknown;
  };
}

/**
 * Check if pattern analysis should run for user
 */
export async function shouldRunAnalysis(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ shouldRun: boolean; reason: string }> {
  // Check cache first
  const cached = await getCachedAnalysis(supabase, userId);

  if (cached && !isCacheExpired(cached)) {
    return {
      shouldRun: false,
      reason: "cache_fresh",
    };
  }

  // Get last analysis time
  const lastAnalysis = await getLastAnalysisTime(supabase, userId);

  if (!lastAnalysis) {
    // Never analyzed before
    return {
      shouldRun: true,
      reason: "first_analysis",
    };
  }

  const hoursSinceLastAnalysis = (Date.now() - new Date(lastAnalysis).getTime()) / (1000 * 60 * 60);

  // Check if 24h passed
  if (hoursSinceLastAnalysis >= 24) {
    return {
      shouldRun: true,
      reason: "24h_passed",
    };
  }

  // Check new meals count since last analysis
  const newMealsCount = await countMealsSince(supabase, userId, lastAnalysis);

  if (newMealsCount >= 3) {
    return {
      shouldRun: true,
      reason: "new_meals_threshold",
    };
  }

  return {
    shouldRun: false,
    reason: "insufficient_trigger",
  };
}

/**
 * Get cached analysis result
 */
async function getCachedAnalysis(
  supabase: SupabaseClient,
  userId: string,
): Promise<AnalysisCache | null> {
  // Try to get from pattern_insights metadata
  const { data } = await supabase
    .from("pattern_insights")
    .select("analysis_metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data?.analysis_metadata) return null;

  const metadata = data.analysis_metadata as Record<string, unknown>;
  if (!metadata.cache_until) return null;

  return {
    user_id: userId,
    analyzed_at: metadata.analyzed_at as string,
    cache_until: metadata.cache_until as string,
    result: {
      detected_count: metadata.detected_count as number,
      top_pattern: metadata.top_pattern,
    },
  };
}

/**
 * Check if cache is expired
 */
function isCacheExpired(cache: AnalysisCache): boolean {
  return new Date(cache.cache_until) < new Date();
}

/**
 * Get last analysis timestamp from pattern_insights
 */
async function getLastAnalysisTime(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("pattern_insights")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.created_at || null;
}

/**
 * Count meals logged since a timestamp
 */
async function countMealsSince(
  supabase: SupabaseClient,
  userId: string,
  since: string,
): Promise<number> {
  const { count } = await supabase
    .from("meal_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("logged_at", since);

  return count || 0;
}

/**
 * Save analysis cache (24h TTL)
 */
export async function saveAnalysisCache(
  supabase: SupabaseClient,
  userId: string,
  result: { detected_count: number; top_pattern: unknown },
): Promise<void> {
  const now = new Date();
  const cacheUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now

  // Store in latest pattern's metadata
  const { data: latest } = await supabase
    .from("pattern_insights")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await supabase
      .from("pattern_insights")
      .update({
        analysis_metadata: {
          analyzed_at: now.toISOString(),
          cache_until: cacheUntil.toISOString(),
          detected_count: result.detected_count,
          top_pattern: result.top_pattern,
        },
      })
      .eq("id", latest.id);
  }
}

/**
 * Get users that need analysis (for cron job)
 */
export async function getUsersNeedingAnalysis(
  supabase: SupabaseClient,
  limit = 100,
): Promise<string[]> {
  // Get users who logged meals in last 24h
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data } = await supabase
    .from("meal_logs")
    .select("user_id")
    .gte("logged_at", twentyFourHoursAgo.toISOString())
    .limit(limit);

  if (!data) return [];

  // Deduplicate user IDs
  const uniqueUserIds = Array.from(new Set(data.map((m) => m.user_id)));

  // Filter to users who actually need analysis
  const needingAnalysis: string[] = [];

  for (const userId of uniqueUserIds) {
    const { shouldRun } = await shouldRunAnalysis(supabase, userId);
    if (shouldRun) {
      needingAnalysis.push(userId);
    }
  }

  return needingAnalysis;
}
