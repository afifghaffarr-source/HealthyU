/**
 * Pattern Detection Service Orchestrator
 *
 * Main service that:
 * 1. Fetches 14-day meal logs
 * 2. Runs all 7 rule engines in parallel
 * 3. Scores patterns (hybrid: hardcoded + AI)
 * 4. Saves to pattern_insights table
 * 5. Checks auto-resolution
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedPattern, ScoredPattern, PatternInsight } from "../types/pattern";
import { detectTimePatterns } from "../lib/timePatterns.server";
import { detectEmotionalPatterns } from "../lib/emotionalPatterns.server";
import { detectSocialPatterns } from "../lib/socialPatterns.server";
import { detectCravingPatterns } from "../lib/cravingPatterns.server";
import { detectSchedulePatterns } from "../lib/schedulePatterns.server";
import { detectLocationPatterns } from "../lib/locationPatterns.server";
import { detectHungerPatterns } from "../lib/hungerPatterns.server";
import { scorePatterns } from "../lib/patternScoring.server";

interface MealLogFull {
  id: string;
  log_date: string;
  logged_at: string;
  meal_type: string | null;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  hunger_level_before: number | null;
  hunger_level_after: number | null;
  mood_before: number | null;
  mood_after: number | null;
  location_name: string | null;
  food_name?: string;
}

/**
 * Fetch 14-day meal logs for user
 */
async function fetch14DayMeals(supabase: SupabaseClient, userId: string): Promise<MealLogFull[]> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", fourteenDaysAgo.toISOString().split("T")[0])
    .order("logged_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Run all 7 rule engines in parallel
 */
async function runAllRuleEngines(meals: MealLogFull[]): Promise<DetectedPattern[]> {
  // Run all detections in parallel
  const results = await Promise.all([
    Promise.resolve(detectTimePatterns(meals)),
    Promise.resolve(detectEmotionalPatterns(meals)),
    Promise.resolve(detectSocialPatterns(meals)),
    Promise.resolve(detectCravingPatterns(meals)),
    Promise.resolve(detectSchedulePatterns(meals)),
    Promise.resolve(detectLocationPatterns(meals)),
    Promise.resolve(detectHungerPatterns(meals)),
  ]);

  // Flatten results
  return results.flat();
}

/**
 * Save or update pattern insights in database
 */
async function upsertPatternInsights(
  supabase: SupabaseClient,
  userId: string,
  patterns: ScoredPattern[],
  windowStart: string,
  windowEnd: string,
): Promise<void> {
  for (const pattern of patterns) {
    // Check if pattern already exists (active)
    const { data: existing } = await supabase
      .from("pattern_insights")
      .select("id, baseline_count")
      .eq("user_id", userId)
      .eq("pattern_type", pattern.type)
      .is("resolved_at", null)
      .single();

    if (existing) {
      // Update existing pattern
      await supabase
        .from("pattern_insights")
        .update({
          last_occurrence: new Date().toISOString(),
          occurrence_count: pattern.count,
          urgency_score: pattern.score,
          ai_explanation: pattern.reason || "",
          ai_recommendation: pattern.recommendation || "",
          quick_actions: pattern.quick_actions || [],
          detection_window_end: windowEnd,
          analysis_metadata: pattern.metadata,
        })
        .eq("id", existing.id);
    } else {
      // Insert new pattern
      await supabase.from("pattern_insights").insert({
        user_id: userId,
        pattern_type: pattern.type,
        detected_at: new Date().toISOString(),
        last_occurrence: new Date().toISOString(),
        occurrence_count: pattern.count,
        baseline_count: pattern.count, // Set baseline for future improvement tracking
        urgency_score: pattern.score,
        ai_explanation: pattern.reason || "",
        ai_recommendation: pattern.recommendation || "",
        quick_actions: pattern.quick_actions || [],
        detection_window_start: windowStart,
        detection_window_end: windowEnd,
        analysis_metadata: pattern.metadata,
      });
    }
  }
}

/**
 * Check and auto-resolve patterns that have improved 70%+
 */
async function checkAutoResolution(
  supabase: SupabaseClient,
  userId: string,
  currentPatterns: DetectedPattern[],
): Promise<void> {
  // Fetch all active patterns for user
  const { data: activePatterns } = await supabase
    .from("pattern_insights")
    .select("*")
    .eq("user_id", userId)
    .is("resolved_at", null);

  if (!activePatterns || activePatterns.length === 0) return;

  for (const pattern of activePatterns) {
    // Check if pattern was detected 14+ days ago
    const daysSinceDetection = Math.floor(
      (Date.now() - new Date(pattern.detected_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDetection < 14) continue;

    // Find current occurrence count for this pattern type
    const current = currentPatterns.find((p) => p.type === pattern.pattern_type);
    const currentCount = current?.count || 0;
    const baseline = pattern.baseline_count || pattern.occurrence_count;

    // Calculate improvement
    const improvement = baseline > 0 ? (baseline - currentCount) / baseline : 0;

    // Auto-resolve if improved 70%+
    if (improvement >= 0.7) {
      await supabase
        .from("pattern_insights")
        .update({
          resolved_at: new Date().toISOString(),
          occurrence_count: currentCount,
          analysis_metadata: {
            ...pattern.analysis_metadata,
            resolution_type: "auto_improved",
            improvement_percentage: Math.round(improvement * 100),
          },
        })
        .eq("id", pattern.id);
    }
  }
}

/**
 * Main pattern detection function
 * Called by cron job or on-demand
 */
export async function detectPatternsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  detected_count: number;
  top_pattern: ScoredPattern | null;
  analyzed_at: string;
}> {
  // 1. Fetch 14-day meal logs
  const meals = await fetch14DayMeals(supabase, userId);

  if (meals.length < 7) {
    // Not enough data (less than 7 meals in 14 days)
    return {
      detected_count: 0,
      top_pattern: null,
      analyzed_at: new Date().toISOString(),
    };
  }

  // 2. Run all rule engines
  const candidates = await runAllRuleEngines(meals);

  if (candidates.length === 0) {
    // No patterns detected
    return {
      detected_count: 0,
      top_pattern: null,
      analyzed_at: new Date().toISOString(),
    };
  }

  // 3. Score patterns (hybrid: hardcoded + AI)
  const scored = await scorePatterns(supabase, userId, candidates);

  // 4. Save to database
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 14);
  const windowEnd = new Date();

  await upsertPatternInsights(
    supabase,
    userId,
    scored,
    windowStart.toISOString().split("T")[0],
    windowEnd.toISOString().split("T")[0],
  );

  // 5. Check auto-resolution
  await checkAutoResolution(supabase, userId, candidates);

  // Return summary
  return {
    detected_count: scored.length,
    top_pattern: scored[0] || null,
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Fetch top pattern for user (for dashboard)
 */
export async function getTopPattern(
  supabase: SupabaseClient,
  userId: string,
): Promise<PatternInsight | null> {
  const { data } = await supabase
    .from("pattern_insights")
    .select("*")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .order("urgency_score", { ascending: false })
    .limit(1)
    .single();

  return data || null;
}

/**
 * Fetch all patterns for user (for profile insights page)
 */
export async function getAllPatterns(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ active: PatternInsight[]; resolved: PatternInsight[] }> {
  const { data: all } = await supabase
    .from("pattern_insights")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false });

  if (!all) return { active: [], resolved: [] };

  return {
    active: all.filter((p) => !p.resolved_at),
    resolved: all.filter((p) => p.resolved_at),
  };
}
