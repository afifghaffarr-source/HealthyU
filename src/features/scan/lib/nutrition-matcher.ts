/**
 * Sprint W2: AI Warung Mode — Nutrition Matcher
 *
 * Fuzzy match AI-detected food names against food_items.aliases database.
 * Returns verified TKPI nutrition data when available, falls back to AI estimates.
 *
 * Ref: docs/features/ai-warung-mode-spec.md (PR #27 v3)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type FoodItem = {
  id: number;
  name: string;
  name_en: string | null;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: number;
  serving_unit: string;
  aliases: string[] | null;
  portion_label: string | null;
  source: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string | null;
};

export type MatchResult = {
  matched: boolean;
  food_item_id?: number;
  canonical_name?: string;
  source?: string; // 'TKPI' | 'manual' | 'kaggle'
  confidence_score?: number;
  verified_nutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    serving_size: number;
    serving_unit: string;
    portion_label?: string | null;
  };
  ai_estimate: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    portion_g?: number;
  };
};

/**
 * Fuzzy match a single food name against food_items.aliases.
 * Returns best match if confidence_score threshold met.
 *
 * Strategy:
 * 1. Exact match on name or aliases (case-insensitive)
 * 2. Partial substring match (e.g., "nasgor" matches "nasi goreng")
 * 3. Word overlap (e.g., "ayam bakar" matches "ayam" OR "bakar")
 *
 * @param supabase - Supabase client
 * @param detectedName - Food name from AI (e.g., "Nasi Goreng", "nasgor")
 * @param aiEstimate - AI's nutrition estimates (fallback if no DB match)
 * @returns Match result with verified nutrition or AI estimates
 */
export async function matchFoodItem(
  supabase: SupabaseClient,
  detectedName: string,
  aiEstimate: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    portion_g?: number;
  },
): Promise<MatchResult> {
  const normalized = detectedName.toLowerCase().trim();

  // Strategy 1: Exact match on name or aliases
  const { data: exactMatch } = await supabase
    .from("food_items")
    .select("*")
    .or(`name.ilike.${normalized},aliases.cs.{${normalized}}`)
    .order("confidence_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exactMatch) {
    return {
      matched: true,
      food_item_id: exactMatch.id,
      canonical_name: exactMatch.name,
      source: exactMatch.source ?? undefined,
      confidence_score: exactMatch.confidence_score ?? undefined,
      verified_nutrition: {
        calories: exactMatch.calories,
        protein_g: exactMatch.protein_g,
        carbs_g: exactMatch.carbs_g,
        fat_g: exactMatch.fat_g,
        fiber_g: exactMatch.fiber_g,
        serving_size: exactMatch.serving_size,
        serving_unit: exactMatch.serving_unit,
        portion_label: exactMatch.portion_label,
      },
      ai_estimate: aiEstimate,
    };
  }

  // Strategy 2: Partial substring match (check if any alias contains the query or vice versa)
  const { data: allItems } = await supabase
    .from("food_items")
    .select("*")
    .order("confidence_score", { ascending: false });

  if (allItems) {
    for (const item of allItems) {
      const aliases = item.aliases ?? [];

      // Check if normalized query matches any alias (substring or reverse)
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        if (
          aliasLower.includes(normalized) ||
          normalized.includes(aliasLower) ||
          item.name.toLowerCase().includes(normalized) ||
          normalized.includes(item.name.toLowerCase())
        ) {
          // Require minimum confidence score threshold from DB
          const minConfidence = item.confidence_score ?? 0.5;
          if (minConfidence >= 0.5) {
            return {
              matched: true,
              food_item_id: item.id,
              canonical_name: item.name,
              source: item.source ?? undefined,
              confidence_score: item.confidence_score ?? undefined,
              verified_nutrition: {
                calories: item.calories,
                protein_g: item.protein_g,
                carbs_g: item.carbs_g,
                fat_g: item.fat_g,
                fiber_g: item.fiber_g,
                serving_size: item.serving_size,
                serving_unit: item.serving_unit,
                portion_label: item.portion_label,
              },
              ai_estimate: aiEstimate,
            };
          }
        }
      }
    }
  }

  // Strategy 3: Word overlap (tokenize and check for common words)
  const queryWords = normalized.split(/\s+/).filter((w) => w.length > 2); // ignore short words

  if (queryWords.length > 0 && allItems) {
    for (const item of allItems) {
      const aliases = item.aliases ?? [];
      const itemNameWords = item.name.toLowerCase().split(/\s+/);

      for (const alias of aliases) {
        const aliasWords = alias.toLowerCase().split(/\s+/);
        const allWords = [...itemNameWords, ...aliasWords];

        // Count overlapping words
        const overlapCount = queryWords.filter((qw) =>
          allWords.some((iw) => iw.includes(qw) || qw.includes(iw)),
        ).length;

        // Require at least 50% word overlap
        if (overlapCount / queryWords.length >= 0.5) {
          const minConfidence = item.confidence_score ?? 0.5;
          if (minConfidence >= 0.5) {
            return {
              matched: true,
              food_item_id: item.id,
              canonical_name: item.name,
              source: item.source ?? undefined,
              confidence_score: item.confidence_score ?? undefined,
              verified_nutrition: {
                calories: item.calories,
                protein_g: item.protein_g,
                carbs_g: item.carbs_g,
                fat_g: item.fat_g,
                fiber_g: item.fiber_g,
                serving_size: item.serving_size,
                serving_unit: item.serving_unit,
                portion_label: item.portion_label,
              },
              ai_estimate: aiEstimate,
            };
          }
        }
      }
    }
  }

  // No match found — return AI estimates only
  return {
    matched: false,
    ai_estimate: aiEstimate,
  };
}

/**
 * Batch match multiple detected foods.
 * More efficient than calling matchFoodItem() in a loop (fetches food_items once).
 *
 * @param supabase - Supabase client
 * @param detectedItems - Array of {name, ai_estimate} from AI scan
 * @returns Array of match results
 */
export async function matchFoodItemsBatch(
  supabase: SupabaseClient,
  detectedItems: Array<{
    name: string;
    ai_estimate: {
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      portion_g?: number;
    };
  }>,
): Promise<MatchResult[]> {
  // Fetch all food items once
  const { data: allItems } = await supabase
    .from("food_items")
    .select("*")
    .order("confidence_score", { ascending: false });

  if (!allItems) {
    // Fallback to AI estimates only
    return detectedItems.map((item) => ({
      matched: false,
      ai_estimate: item.ai_estimate,
    }));
  }

  // Match each detected item
  const results: MatchResult[] = [];

  for (const detected of detectedItems) {
    const normalized = detected.name.toLowerCase().trim();
    let bestMatch: (FoodItem & { matchScore: number }) | null = null;

    // Try all matching strategies for this item
    for (const item of allItems) {
      let matchScore = 0;
      const aliases = item.aliases ?? [];
      const itemNameLower = item.name.toLowerCase();

      // Exact match (highest score)
      if (itemNameLower === normalized || aliases.includes(normalized)) {
        matchScore = 1.0;
      }
      // Substring match
      else if (
        itemNameLower.includes(normalized) ||
        normalized.includes(itemNameLower) ||
        aliases.some((a: string) => a.includes(normalized) || normalized.includes(a))
      ) {
        matchScore = 0.8;
      }
      // Word overlap
      else {
        const queryWords = normalized.split(/\s+/).filter((w) => w.length > 2);
        if (queryWords.length > 0) {
          const itemWords = [
            ...itemNameLower.split(/\s+/),
            ...aliases.flatMap((a: string) => a.split(/\s+/)),
          ];
          const overlapCount = queryWords.filter((qw) =>
            itemWords.some((iw) => iw.includes(qw) || qw.includes(iw)),
          ).length;
          matchScore = (overlapCount / queryWords.length) * 0.6; // word overlap scores lower
        }
      }

      // Update best match if this item scores higher
      const minConfidence = item.confidence_score ?? 0.5;
      if (matchScore > 0 && matchScore >= 0.5 && minConfidence >= 0.5) {
        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = { ...item, matchScore };
        }
      }
    }

    if (bestMatch) {
      results.push({
        matched: true,
        food_item_id: bestMatch.id,
        canonical_name: bestMatch.name,
        source: bestMatch.source ?? undefined,
        confidence_score: bestMatch.confidence_score ?? undefined,
        verified_nutrition: {
          calories: bestMatch.calories,
          protein_g: bestMatch.protein_g,
          carbs_g: bestMatch.carbs_g,
          fat_g: bestMatch.fat_g,
          fiber_g: bestMatch.fiber_g,
          serving_size: bestMatch.serving_size,
          serving_unit: bestMatch.serving_unit,
          portion_label: bestMatch.portion_label,
        },
        ai_estimate: detected.ai_estimate,
      });
    } else {
      results.push({
        matched: false,
        ai_estimate: detected.ai_estimate,
      });
    }
  }

  return results;
}
