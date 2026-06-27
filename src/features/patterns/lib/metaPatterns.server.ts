/**
 * Meta-Pattern Detection Engine
 * Sprint 12 — detects combinations of single patterns firing together
 *
 * ponytail:
 * - separate type (MetaDetectedPattern) from single DetectedPattern
 * - reads pattern_type strings ONLY from existing 21-pattern enum
 * - meta identity lives in metadata, not pattern_type (CHECK constraint compatible)
 * - no AI call (pure rule-based overlap) → $0 cost
 *
 * Co-occurrence model:
 *   Two patterns P1, P2 are "linking" if their matched_dates[] overlap on >= minOverlap days.
 *   A meta-pattern fires when ALL its component patterns are detected AND
 *   their matched_dates overlap on >= minOverlap days (default 2).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedPattern, MetaPatternType, MetaPatternDefinition } from "../types/pattern";

export interface MetaDetectedPattern {
  /** Meta-pattern identifier; UI uses this to render title/icon */
  type: "meta_pattern";
  /** Stable meta ID (e.g. "stress_late_night_combo") for DB lookup & analytics */
  metapattern_id: MetaPatternType;
  count: number;
  detected: boolean;
  /** Days where all component patterns co-occurred */
  matched_dates: string[];
  /** Pattern types that compose this meta-pattern */
  components: string[];
  /** Sum of component occurrence_count (rough urgency proxy) */
  total_component_occurrences: number;
  metadata: {
    metapattern_title: string;
    metapattern_description: string;
    component_days: Record<string, string[]>;
  };
}

// Registry of all known meta-patterns
// ponytail: keep this list SHORT and CURATED. Add only combos with REAL clinical/actionable value.
export const META_PATTERN_REGISTRY: MetaPatternDefinition[] = [
  {
    id: "stress_late_night_combo",
    title: "Stress + Makan Malam Terlambat",
    description:
      "Kamu makan malam larut saat sedang stres. Stres + makanan berat di malam hari = lingkaran setan sleep + cortisol.",
    components: ["stress_eating", "late_night_eating"],
    minOverlapDays: 2,
  },
  {
    id: "weekend_indulgence_combo",
    title: "Weekend Over-Indulgence",
    description:
      "Akhir pekan + tempat makan favorit = porsi lebih. Pola ini mengimbangi progress weekday.",
    components: ["weekend_splurge", "warung_overeat"],
    minOverlapDays: 2,
  },
  {
    id: "emotional_mood_cycle",
    title: "Mood Cycle Makan Berlebihan",
    description:
      "Mood rendah → makan banyak → mood tetap rendah. Siklus emosional yang berkaitan dengan makanan.",
    components: ["stress_eating", "mood_binges"],
    minOverlapDays: 2,
  },
];

/**
 * Compute date-set intersection across N arrays of date strings.
 * Returns sorted unique overlap dates.
 */
function dateIntersection(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const [first, ...rest] = lists;
  const counts = new Map<string, number>();
  for (const date of first) counts.set(date, 1);
  for (const list of rest) {
    const seenThisRound = new Set<string>();
    for (const date of list) {
      if (counts.has(date) && !seenThisRound.has(date)) {
        counts.set(date, counts.get(date)! + 1);
        seenThisRound.add(date);
      }
    }
  }
  const minRequired = lists.length; // every list must contain the date
  return [...counts.entries()]
    .filter(([, n]) => n >= minRequired)
    .map(([d]) => d)
    .sort();
}

/**
 * Detect if a single meta-pattern definition fires given all detected patterns.
 * Returns null if not enough evidence.
 */
function detectOneMeta(
  definition: MetaPatternDefinition,
  detectedPatterns: DetectedPattern[],
): MetaDetectedPattern | null {
  // Filter: only consider patterns currently detected (not just candidate)
  const componentPatterns = detectedPatterns.filter(
    (p) => p.detected && definition.components.includes(p.type),
  );

  // Need ALL components present
  if (componentPatterns.length !== definition.components.length) return null;

  const overlap = dateIntersection(componentPatterns.map((p) => p.matched_dates));
  const minOverlap = definition.minOverlapDays ?? 2;
  if (overlap.length < minOverlap) return null;

  const totalOccurrences = componentPatterns.reduce((sum, p) => sum + p.count, 0);

  return {
    type: "meta_pattern",
    metapattern_id: definition.id,
    count: overlap.length,
    detected: true,
    matched_dates: overlap,
    components: definition.components,
    total_component_occurrences: totalOccurrences,
    metadata: {
      metapattern_title: definition.title,
      metapattern_description: definition.description,
      component_days: Object.fromEntries(componentPatterns.map((p) => [p.type, p.matched_dates])),
    },
  };
}

/**
 * Run all meta-pattern detections on current-run flagged patterns.
 *
 * Input: list of detected single patterns from the 7 rule engines
 * Output: list of meta-patterns that fired (only when all components + overlap rule met)
 *
 * Pure function — no DB access, no AI. Called as post-step after `runAllRuleEngines`.
 */
export function detectMetaPatterns(detectedPatterns: DetectedPattern[]): MetaDetectedPattern[] {
  const results: MetaDetectedPattern[] = [];
  for (const def of META_PATTERN_REGISTRY) {
    const meta = detectOneMeta(def, detectedPatterns);
    if (meta) results.push(meta);
  }
  return results;
}

/**
 * Look up active meta-patterns from DB for a user.
 * Returns rows where is_meta=true AND resolved_at IS NULL.
 *
 * ponytail: reads from existing pattern_insights table using metapattern_components JSONB.
 * No separate meta-pattern table.
 */
export async function fetchActiveMetaPatterns(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  Array<{
    id: string;
    metapattern_id: MetaPatternType;
    components: string[];
    explanation: string;
    recommendation: string;
    urgency_score: number;
    last_occurrence: string;
    detected_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("pattern_insights")
    .select(
      "id, metapattern_components, analysis_metadata, ai_explanation, ai_recommendation, urgency_score, last_occurrence, detected_at",
    )
    .eq("user_id", userId)
    .eq("is_meta", true)
    .is("resolved_at", null)
    .order("urgency_score", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    metapattern_id: (row.analysis_metadata as Record<string, unknown>)
      ?.metapattern_id as MetaPatternType,
    components: (row.metapattern_components ?? []) as string[],
    explanation: row.ai_explanation,
    recommendation: row.ai_recommendation,
    urgency_score: row.urgency_score,
    last_occurrence: row.last_occurrence,
    detected_at: row.detected_at,
  }));
}
