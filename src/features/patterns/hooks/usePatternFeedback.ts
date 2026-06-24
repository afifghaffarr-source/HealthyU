/**
 * Pattern Feedback Hook
 * Sprint 10b enhancement - "Was this helpful?" UI
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitPatternFeedback } from "../lib/patternFeedback.functions";
export function usePatternFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { patternId: string; helpful: boolean }) => {
      return await submitPatternFeedback({ data });
    },
    onSuccess: () => {
      // Invalidate patterns query to reflect feedback state
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
    },
  });
}
