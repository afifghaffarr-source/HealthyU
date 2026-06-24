/**
 * Pattern Preferences Hook
 * Sprint 10c Phase 1 - Custom Thresholds
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserPreferences, updateUserPreferences } from "../lib/patternPreferences.functions";
import type { PatternSensitivity } from "../types/preferences";
import type { PatternCategory } from "../types/pattern";

export function usePatternPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["pattern-preferences", userId],
    queryFn: () => getUserPreferences({ data: { userId: userId! } }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const updateMutation = useMutation({
    mutationFn: (update: {
      sensitivity?: PatternSensitivity;
      enabled_categories?: PatternCategory[];
    }) =>
      updateUserPreferences({
        data: {
          userId: userId!,
          ...update,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern-preferences", userId] });
      queryClient.invalidateQueries({ queryKey: ["pattern-insights", userId] });
    },
  });

  return {
    preferences,
    isLoading,
    updateSensitivity: (sensitivity: PatternSensitivity) => updateMutation.mutate({ sensitivity }),
    toggleCategory: (category: PatternCategory) => {
      if (!preferences) return;
      const current = preferences.enabled_categories;
      const updated = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      updateMutation.mutate({ enabled_categories: updated });
    },
    isUpdating: updateMutation.isPending,
  };
}
