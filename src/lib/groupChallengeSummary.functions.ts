import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const myGroupChallengeSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeGroupChallengeSummary } = await import("./reportsGroupChallenges.server");
    return computeGroupChallengeSummary(context.userId);
  });
