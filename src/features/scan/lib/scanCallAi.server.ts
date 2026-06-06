import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { callAiWithGuards, AiGatewayError } from "@/features/ai/lib/aiGateway.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit.server";

export function makeScanAiCaller(feature: string) {
  return async function callAI(
    prompt: string,
    system: string,
    userId: string | null = null,
    supabase?: SupabaseClient<Database>,
  ) {
    if (userId && supabase) {
      const allowed = await checkRateLimit(
        supabase,
        RATE_LIMITS.ai_scan.bucket,
        RATE_LIMITS.ai_scan.max,
        RATE_LIMITS.ai_scan.windowSec,
        { failClosed: true },
      );
      if (!allowed) {
        throw new AiGatewayError("Batas scan AI tercapai. Coba lagi nanti.", 429);
      }
    }
    return callAiWithGuards({
      userId,
      feature,
      failClosed: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
  };
}