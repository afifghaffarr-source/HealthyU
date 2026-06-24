/**
 * Pattern Scoring Logic (Hybrid: Hardcoded + AI)
 *
 * 70% cases: Hardcoded priority rules based on health conditions, goals, frequency, calories
 * 30% cases: AI refinement via Gemini Flash with compressed input (250 tokens)
 *
 * Cost: $0.0006 per AI call, ~$5.40/month per 1000 users
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedPattern, ScoredPattern, QuickAction } from "../types/pattern";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { z } from "zod";

interface UserProfile {
  user_id: string;
  birth_date: string | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  goal: string | null;
  daily_calorie_target: number | null;
  health_conditions: string[] | null;
  activity_level: string | null;
}

/**
 * Fetch user profile for scoring context
 */
async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("users")
    .select(
      "user_id, birth_date, gender, weight_kg, height_cm, target_weight_kg, goal, daily_calorie_target, health_conditions, activity_level",
    )
    .eq("user_id", userId)
    .single();

  return data || null;
}

/**
 * Apply hardcoded priority rules (70% coverage)
 */
function applyHardcodedScoring(pattern: DetectedPattern, profile: UserProfile | null): number {
  let score = 50; // Base score

  const healthConditions = profile?.health_conditions || [];
  const goal = profile?.goal || "";

  // Health-critical rules (highest priority)
  if (healthConditions.includes("diabetes") || healthConditions.includes("prediabetes")) {
    if (pattern.type === "sugar_crashes") score = 90;
    if (pattern.type === "late_night_eating" && (pattern.avg_carbs || 0) > 60) score = 85;
    if (pattern.type === "night_cravings") score = 82;
  }

  if (healthConditions.includes("hypertension")) {
    if (pattern.type === "stress_eating") score = 88;
    if (pattern.type === "warung_overeat") score = 80; // High sodium risk
  }

  // Goal alignment rules
  if (goal === "weight_loss") {
    if (pattern.type === "stress_eating") score = 80;
    if (pattern.type === "celebration_overeat") score = 75;
    if (pattern.type === "late_night_eating") score = 70;
    if (pattern.type === "weekend_splurge") score = 72;
    if (pattern.type === "gathering_overeat") score = 74;
  }

  if (goal === "muscle_gain") {
    if (pattern.type === "skip_breakfast") score = 75;
    if (pattern.type === "busy_day_skips") score = 78;
  }

  // Frequency boost
  if (pattern.count >= 7) score += 10; // >50% of days
  if (pattern.count >= 10) score += 5; // >70% of days

  // Calorie impact boost
  const avgCal = pattern.avg_calories || 0;
  if (avgCal > 700) score += 8;
  if (avgCal > 1000) score += 5;

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Check if AI refinement is needed
 */
function needsAIRefinement(scoredPatterns: ScoredPattern[]): boolean {
  if (scoredPatterns.length === 0) return false;
  if (scoredPatterns.length === 1) return false; // Only one pattern, no need to refine

  // Check for ties (scores within 5 points of each other in top 3)
  const top3 = scoredPatterns.slice(0, 3);
  const maxScore = top3[0].score;
  const ties = top3.filter((p) => Math.abs(p.score - maxScore) <= 5);

  return ties.length >= 2; // 2+ patterns tied
}

/**
 * Compress context for AI (600 tokens → 250 tokens)
 */
function compressContext(
  profile: UserProfile | null,
  patterns: ScoredPattern[],
): { user: string; patterns: string } {
  if (!profile) {
    return {
      user: "unknown",
      patterns: patterns.map((p) => `${p.type}:${p.count}x`).join(";"),
    };
  }

  // Calculate age and BMI
  const age = profile.birth_date
    ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear()
    : null;

  const bmi =
    profile.weight_kg && profile.height_cm
      ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
      : null;

  const health = (profile.health_conditions || []).join(",") || "-";

  // Compress user: "28M,75kg,23.5BMI,diabetes,weight_loss,1800kcal"
  const user = [
    age ? `${age}${(profile.gender || "U")[0].toUpperCase()}` : "U",
    profile.weight_kg ? `${profile.weight_kg}kg` : "",
    bmi ? `${bmi}BMI` : "",
    health,
    profile.goal || "maintenance",
    profile.daily_calorie_target ? `${profile.daily_calorie_target}kcal` : "",
  ]
    .filter(Boolean)
    .join(",");

  // Compress patterns: "skip_breakfast:5x 0kcal;stress_eating:4x 720kcal"
  const patternsStr = patterns
    .map((p) => {
      const parts = [p.type, `${p.count}x`, p.avg_calories ? `${p.avg_calories}kcal` : ""]
        .filter(Boolean)
        .join(" ");
      return parts;
    })
    .join(";");

  return { user, patterns: patternsStr };
}

/**
 /**
  * Call AI for refinement (Gemini Flash via VexoAPI)
  * Cost: ~$0.0006 per call (250 input tokens + 300 output tokens)
  */
async function callAIForScoring(compressed: {
  user: string;
  patterns: string;
}): Promise<Array<{ type: string; score: number; reason: string; recommendation: string }>> {
  // Import AI gateway
  const { callAiJsonWithGuards } = await import("@/features/ai/lib/aiGateway.server");

  const prompt = `You are a diet pattern analyzer. Score these eating patterns (0-100) based on health impact, goal alignment, and ease of fix.

 User context: ${compressed.user}
 Patterns detected: ${compressed.patterns}

 Return ONLY a JSON array with this exact structure:
 [
   {
     "type": "pattern_type",
     "score": 75,
     "reason": "Short explanation in Indonesian (max 100 chars)",
     "recommendation": "Actionable tip in Indonesian (max 150 chars)"
   }
 ]

 Rules:
 - Higher score = more urgent to address
 - Health risks (diabetes + sugar) = 85-95
 - Goal misalignment (weight loss + overeating) = 70-85
 - Minor issues = 50-65
 - Keep Indonesian casual & friendly ("kamu", not formal)`;

  try {
    const PatternScoreSchema = z.array(
      z.object({
        type: z.string(),
        score: z.number(),
        reason: z.string(),
        recommendation: z.string(),
      }),
    );

    const result = await callAiJsonWithSchema({
      userId: null,
      feature: "patterns.scoring",
      messages: [
        {
          role: "system",
          content: "You are a helpful diet pattern analyzer. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      model: "google/gemini-2.5-flash-lite",
      skipBudget: true,
      timeoutMs: 15000,
      schema: PatternScoreSchema,
    });

    // Parse response
    if (Array.isArray(result)) {
      return result.map((item) => ({
        type: item.type || "",
        score: typeof item.score === "number" ? item.score : 50,
        reason: item.reason || "",
        recommendation: item.recommendation || "",
      }));
    }

    // Fallback: empty array if parsing fails
    console.warn("[Pattern AI] Invalid response format:", result);
    return [];
  } catch (error) {
    console.error("[Pattern AI] API call failed:", error);
    // Fail gracefully: return empty array, hardcoded scores will be used
    return [];
  }
}

/**
 * Generate quick actions based on pattern type
 */
function generateQuickActions(pattern: ScoredPattern): QuickAction[] {
  const actions: Record<string, QuickAction[]> = {
    skip_breakfast: [
      {
        type: "reminder",
        label: "Set 7 AM reminder",
        action_data: { time: "07:00", message: "Waktunya sarapan!" },
      },
      {
        type: "recipes",
        label: "Quick breakfast ideas",
        action_data: { filter: "breakfast,quick" },
      },
    ],
    late_night_eating: [
      {
        type: "reminder",
        label: "Set 9 PM eating cutoff",
        action_data: { time: "21:00", message: "Jangan makan lagi ya!" },
      },
      {
        type: "tips",
        label: "Low-cal night snacks",
        action_data: { tips: ["Teh herbal", "Greek yogurt", "Apel kecil"] },
      },
    ],
    stress_eating: [
      { type: "tracker", label: "Track mood triggers", action_data: { route: "/mood-tracker" } },
      {
        type: "tips",
        label: "Alternatives to stress eating",
        action_data: { tips: ["Jalan 10 menit", "Deep breathing", "Chat temen"] },
      },
    ],
    // Add more mappings as needed
  };

  return actions[pattern.type] || [];
}

/**
 * Generate explanation and recommendation
 */
function generateContent(
  pattern: ScoredPattern,
  profile: UserProfile | null,
): {
  reason: string;
  recommendation: string;
} {
  // Simple template-based generation (can be enhanced with AI)
  const count = pattern.count;
  const type = pattern.type;

  let reason = `Kamu ${type.replace(/_/g, " ")} sebanyak ${count}x dalam 14 hari terakhir.`;
  let recommendation = `Coba kurangi frekuensinya secara bertahap.`;

  // Customize based on pattern type
  if (type === "skip_breakfast") {
    reason = `Kamu skip sarapan ${count}x minggu ini. Ini bisa bikin metabolisme melambat.`;
    recommendation = `Coba overnight oats — prep 5 menit malem, grab & go pagi.`;
  } else if (type === "stress_eating") {
    reason = `Kamu makan banyak pas mood lagi rendah (${count}x minggu ini).`;
    recommendation = `Sebelum makan, coba: 1) Jalan 10 menit, 2) Deep breathing 5x, 3) Chat temen.`;
  } else if (type === "late_night_eating") {
    reason = `Kamu makan malam terlalu larut (${count}x setelah jam 10 malam).`;
    recommendation = `Set cutoff time jam 9 malam. Kalau masih lapar: teh herbal atau yogurt.`;
  }

  return { reason, recommendation };
}

/**
 * Main scoring function
 */
export async function scorePatterns(
  supabase: SupabaseClient,
  userId: string,
  patterns: DetectedPattern[],
): Promise<ScoredPattern[]> {
  if (patterns.length === 0) return [];

  // Fetch user profile
  const profile = await getUserProfile(supabase, userId);

  // Apply hardcoded scoring to all patterns
  const scored: ScoredPattern[] = patterns.map((p) => ({
    ...p,
    score: applyHardcodedScoring(p, profile),
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Check if AI refinement needed (30% cases: ties or complex profiles)
  const needsAI = needsAIRefinement(scored);

  if (needsAI) {
    // Compress and call AI for top 3 patterns
    const top3 = scored.slice(0, 3);
    const compressed = compressContext(profile, top3);
    const aiScores = await callAIForScoring(compressed);

    // Merge AI scores (if returned)
    if (aiScores.length > 0) {
      top3.forEach((p) => {
        const aiMatch = aiScores.find((a) => a.type === p.type);
        if (aiMatch) {
          p.score = aiMatch.score;
          p.reason = aiMatch.reason;
          p.recommendation = aiMatch.recommendation;
        }
      });

      // Re-sort after AI refinement
      scored.sort((a, b) => b.score - a.score);
    }
  }

  // Generate content for all scored patterns
  scored.forEach((p) => {
    if (!p.reason || !p.recommendation) {
      const content = generateContent(p, profile);
      p.reason = content.reason;
      p.recommendation = content.recommendation;
    }
    p.quick_actions = generateQuickActions(p);
  });

  return scored;
}
