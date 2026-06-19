/**
 * AI Provider Status Diagnostic — Sprint 2d debugging endpoint.
 *
 * Returns runtime state of all AI provider configs without exposing any
 * secret values. Use this from HP/browser to verify which providers
 * the deployed Worker can actually see.
 *
 * Hit from browser: https://healthyu.web.id/api/ai-status
 * Returns: { vexo, openrouter, defaultVisionModel, recommendedFix }
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getProviderStatus,
  hasVisionProvider,
  pickVisionModel,
} from "@/features/ai/lib/aiProviders";

export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const status = getProviderStatus();
    const vision = hasVisionProvider();
    const defaultVisionModel = pickVisionModel();
    return {
      ...status,
      hasVisionProvider: vision,
      defaultVisionModel,
      // Plain-language hint for the user, in Bahasa Indonesia
      hint: !status.openrouter
        ? "OPENROUTER_API_KEY belum terdeteksi oleh Worker. Set secret di CF dashboard, lalu trigger scan ulang."
        : !vision
          ? "OPENROUTER_API_KEY terdeteksi tapi vision model belum ada yang free. Cek OpenRouter credit."
          : "Konfigurasi OK. Vision siap dipakai.",
    };
  });
