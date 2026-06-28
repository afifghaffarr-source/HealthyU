/**
 * Pattern Feedback Functions
 * Sprint 10b enhancement - "Was this helpful?" feedback
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { safeLogServerError } from "@/lib/logSafe";

const FeedbackSchema = z.object({
  patternId: z.string().uuid(),
  helpful: z.boolean(),
});

/**
 * Submit user feedback on pattern insight
 * ponytail: updates existing row, no new table
 */
export const submitPatternFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { patternId, helpful } = data;

    // Update feedback column (JSONB) — send object directly, not stringified
    const { error } = await supabase
      .from("pattern_insights")
      .update({
        user_feedback: {
          helpful,
          submitted_at: new Date().toISOString(),
        },
      })
      .eq("id", patternId)
      .eq("user_id", userId); // Security: only update own patterns

    if (error) {
      safeLogServerError("pattern-feedback.submit", error).catch(() => {});
      throw new Error("Failed to submit feedback");
    }

    return { success: true };
  });
