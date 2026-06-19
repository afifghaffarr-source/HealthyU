/**
 * AI Provider Status Diagnostic — Sprint 2d debugging endpoint.
 *
 * Returns runtime state of all AI provider configs without exposing any
 * secret values. Use this from HP/browser to verify which providers
 * the deployed Worker can actually see.
 *
 * Hit from browser: https://healthyu.web.id/api/ai-status
 * Returns: { vexo, openrouter, defaultVisionModel, hint }
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  getProviderStatus,
  hasVisionProvider,
  pickVisionModel,
} from "@/features/ai/lib/aiProviders";

export const Route = createFileRoute("/api/ai-status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const status = getProviderStatus();
          const vision = hasVisionProvider();
          const defaultVisionModel = pickVisionModel();
          const body = {
            ...status,
            hasVisionProvider: vision,
            defaultVisionModel,
            hint: !status.openrouter
              ? "OPENROUTER_API_KEY belum terdeteksi oleh Worker. Set secret di CF dashboard, lalu trigger scan ulang."
              : !vision
                ? "OPENROUTER_API_KEY terdeteksi tapi vision model belum ada yang free. Cek OpenRouter credit."
                : "Konfigurasi OK. Vision siap dipakai.",
          };
          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }, null, 2), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
