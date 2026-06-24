/**
 * Pattern Feedback Hook
 * Sprint 10b enhancement - "Was this helpful?" UI
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitPatternFeedback } from "../lib/patternFeedback.functions";

export function usePatternFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { patternId: string; helpful: boolean }) => submitPatternFeedback(data),
    onSuccess: () => {
      // Invalidate patterns query to reflect feedback state
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
    },
  });
}
