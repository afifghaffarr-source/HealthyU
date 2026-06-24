/**
 * Pattern Insights React Query Hooks
 *
 * Client-side hooks for fetching and managing pattern insights
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PatternInsight, QuickAction } from "../types/pattern";

/**
 * Fetch top pattern for dashboard
 */
export function useTopPattern(userId: string | undefined) {
  return useQuery({
    queryKey: ["pattern-insights", "top", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("pattern_insights")
        .select("*")
        .eq("user_id", userId)
        .is("resolved_at", null)
        .order("urgency_score", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data as PatternInsight | null;
    },
    enabled: !!userId,
    staleTime: 12 * 60 * 60 * 1000, // 12h (pattern analysis runs daily)
  });
}

/**
 * Fetch all patterns for profile insights page
 */
export function useAllPatterns(userId: string | undefined) {
  return useQuery({
    queryKey: ["pattern-insights", "all", userId],
    queryFn: async () => {
      if (!userId) return { active: [], resolved: [] };

      const { data, error } = await supabase
        .from("pattern_insights")
        .select("*")
        .eq("user_id", userId)
        .order("detected_at", { ascending: false });

      if (error) throw error;

      const patterns = (data || []).map((p) => ({
        ...p,
        quick_actions: (p.quick_actions || []) as unknown as QuickAction[],
      })) as PatternInsight[];
      return {
        active: patterns.filter((p) => !p.resolved_at),
        resolved: patterns.filter((p) => p.resolved_at),
      };
    },
    enabled: !!userId,
    staleTime: 12 * 60 * 60 * 1000,
  });
}

/**
 * Dismiss a pattern (mark as user-acknowledged)
 */
export function useDismissPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patternId: string) => {
      const { error } = await supabase
        .from("pattern_insights")
        .update({
          resolved_at: new Date().toISOString(),
          analysis_metadata: JSON.stringify({
            resolution_type: "user_dismissed",
            dismissed_at: new Date().toISOString(),
          }),
        })
        .eq("id", patternId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["pattern-insights"] });
    },
  });
}

/**
 * Snooze a pattern for N days (hide but don't resolve)
 */
export function useSnoozePattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patternId, days }: { patternId: string; days: number }) => {
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);

      const { error } = await supabase
        .from("pattern_insights")
        .update({
          analysis_metadata: JSON.stringify({
            snoozed_until: snoozeUntil.toISOString(),
            snoozed_at: new Date().toISOString(),
          }),
        })
        .eq("id", patternId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern-insights"] });
    },
  });
}

/**
 * Trigger on-demand pattern analysis (manual refresh)
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Call server action to trigger analysis
      const response = await fetch("/api/patterns/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Failed to trigger analysis");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern-insights"] });
    },
  });
}
