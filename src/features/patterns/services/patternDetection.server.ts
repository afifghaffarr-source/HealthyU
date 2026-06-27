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
import { detectMetaPatterns, type MetaDetectedPattern } from "../lib/metaPatterns.server";
import { scorePatterns } from "../lib/patternScoring.server";
import { parsePatternPreferences, type PatternPreferences } from "../types/preferences";
import { generateQuickActionsForPattern } from "../lib/quickActions";

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
 * Run all 7 rule engines in parallel with user preferences
 */
async function runAllRuleEngines(
  meals: MealLogFull[],
  preferences: PatternPreferences,
): Promise<DetectedPattern[]> {
  // Map sensitivity to multiplier: low=0.7, medium=1.0, high=1.3
  const sensitivityMultiplier =
    preferences.sensitivity === "low" ? 0.7 : preferences.sensitivity === "high" ? 1.3 : 1.0;

  // Run all detections in parallel
  const results = await Promise.all([
    Promise.resolve(
      detectTimePatterns(meals, {
        skipBreakfastThreshold: preferences.skip_breakfast_threshold,
        lateNightHour: preferences.late_night_hour,
        irregularVariance: preferences.irregular_meals_variance,
        sensitivity: sensitivityMultiplier,
      }),
    ),
    Promise.resolve(detectEmotionalPatterns(meals, sensitivityMultiplier)),
    Promise.resolve(detectSocialPatterns(meals, sensitivityMultiplier)),
    Promise.resolve(detectCravingPatterns(meals, sensitivityMultiplier)),
    Promise.resolve(detectSchedulePatterns(meals, sensitivityMultiplier)),
    Promise.resolve(detectLocationPatterns(meals, sensitivityMultiplier)),
    Promise.resolve(detectHungerPatterns(meals, sensitivityMultiplier)),
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
  // 1. Fetch user pattern preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("pattern_preferences")
    .eq("id", userId)
    .single();

  const preferences = parsePatternPreferences(profile?.pattern_preferences);

  // 2. Fetch 14-day meal logs
  const meals = await fetch14DayMeals(supabase, userId);

  if (meals.length === 0) {
    return {
      detected_count: 0,
      top_pattern: null,
      analyzed_at: new Date().toISOString(),
    };
  }

  // 3. Run all rule engines with user preferences
  const detectedPatterns = await runAllRuleEngines(meals, preferences);

  if (detectedPatterns.length === 0) {
    return {
      detected_count: 0,
      top_pattern: null,
      analyzed_at: new Date().toISOString(),
    };
  }

  // 4. Score patterns (hybrid: hardcoded + AI)
  const scored = await scorePatterns(supabase, userId, detectedPatterns);

  // 4a. Meta-pattern detection: combinations of single patterns
  // ponytail: reuses same scoring surface (ScoredPattern) — no separate meta scoring.
  const metas = detectMetaPatterns(detectedPatterns);
  const scoredMetas = metas.map((m) => toScoredMeta(m));

  // 5. Save to database
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

  await upsertMetaPatternInsights(
    supabase,
    userId,
    scoredMetas,
    windowStart.toISOString().split("T")[0],
    windowEnd.toISOString().split("T")[0],
  );

  // 6. Check auto-resolution
  await checkAutoResolution(supabase, userId, detectedPatterns);

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
 * Fetch top meta-pattern for dashboard hero (Sprint 13)
 * Meta-patterns score higher (70-95) → prioritized over single patterns
 */
export async function getTopMetaPattern(
  supabase: SupabaseClient,
  userId: string,
): Promise<PatternInsight | null> {
  const { data } = await supabase
    .from("pattern_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("is_meta", true)
    .is("resolved_at", null)
    .order("urgency_score", { ascending: false })
    .limit(1)
    .maybeSingle();

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

/**
 * Convert a meta-pattern detection to the shared ScoredPattern shape so it can
 * flow through the same orchestrator pipeline (DB upsert, UI card).
 *
 * ponytail: meta-patterns sit on top of same single ScoredPattern surface,
 * keeping orchestrator diff minimal.
 */
function toScoredMeta(meta: MetaDetectedPattern): ScoredPattern {
  return {
    type: meta.components[0] as ScoredPattern["type"], // first component, satisfies CHECK constraint
    count: meta.count,
    detected: true,
    matched_dates: meta.matched_dates,
    metadata: {
      ...meta.metadata,
      is_meta: true,
      metapattern_id: meta.metapattern_id,
      metapattern_components: meta.components,
      total_component_occurrences: meta.total_component_occurrences,
    },
    // Meta-pattern scores higher (combo is more actionable than single)
    score: Math.min(95, 70 + meta.count * 5),
    reason: meta.metadata.metapattern_description,
    recommendation: meta.metadata.metapattern_title,
    quick_actions: generateQuickActionsForPattern(meta.metapattern_id),
  };
}

/**
 * Upsert meta-pattern rows in pattern_insights.
 *
 * Dedup key: (user_id, metapattern_id) on rows where is_meta=true AND resolved_at IS NULL.
 * ponytail: reuses single pattern_insights table — no separate meta table.
 */
async function upsertMetaPatternInsights(
  supabase: SupabaseClient,
  userId: string,
  metas: ScoredPattern[],
  windowStart: string,
  windowEnd: string,
): Promise<void> {
  for (const meta of metas) {
    const metapatternId = meta.metadata.metapattern_id as string | undefined;
    if (!metapatternId) continue;

    // Lookup existing active meta-row by composite key
    const { data: existing } = await supabase
      .from("pattern_insights")
      .select("id, baseline_count")
      .eq("user_id", userId)
      .eq("is_meta", true)
      .eq("metapattern_id", metapatternId)
      .is("resolved_at", null)
      .maybeSingle();

    const metapatternComponents = (meta.metadata.metapattern_components ?? []) as string[];

    if (existing) {
      await supabase
        .from("pattern_insights")
        .update({
          last_occurrence: new Date().toISOString(),
          occurrence_count: meta.count,
          urgency_score: meta.score,
          ai_explanation: meta.reason || "",
          ai_recommendation: meta.recommendation || "",
          quick_actions: meta.quick_actions || [],
          detection_window_end: windowEnd,
          metapattern_components: metapatternComponents,
          analysis_metadata: meta.metadata,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("pattern_insights").insert({
        user_id: userId,
        pattern_type: meta.type, // first component — satisfies CHECK
        is_meta: true,
        metapattern_id: metapatternId,
        metapattern_components: metapatternComponents,
        detected_at: new Date().toISOString(),
        last_occurrence: new Date().toISOString(),
        occurrence_count: meta.count,
        baseline_count: meta.count,
        urgency_score: meta.score,
        ai_explanation: meta.reason || "",
        ai_recommendation: meta.recommendation || "",
        quick_actions: meta.quick_actions || [],
        detection_window_start: windowStart,
        detection_window_end: windowEnd,
        analysis_metadata: meta.metadata,
      });
    }
  }
}
