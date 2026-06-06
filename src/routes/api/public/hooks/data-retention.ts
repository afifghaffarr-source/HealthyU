import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cronAuth.server";

// Data retention & cleanup cron job.
// Runs weekly. Cleans up non-user-owned operational data.
//
// IMPORTANT: User health data (meal_logs, water_logs, vitals_logs, etc.) is
// NEVER auto-deleted — that requires explicit user consent per UU PDP.
// This job only cleans operational/system tables.

export const Route = createFileRoute("/api/public/hooks/data-retention")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const results: Record<string, number> = {};

        // 1. Clean rate_limit_log older than 30 days
        {
          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("rate_limit_log")
            .delete({ count: "exact" })
            .lt("created_at", cutoff);
          results.rate_limit_log = count ?? 0;
        }

        // 2. Clean ai_usage_logs older than 90 days
        {
          const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("ai_usage_logs")
            .delete({ count: "exact" })
            .lt("created_at", cutoff);
          results.ai_usage_logs = count ?? 0;
        }

        // 3. Clean expired oauth_states (>24 hours)
        {
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("oauth_states")
            .delete({ count: "exact" })
            .lt("created_at", cutoff);
          results.oauth_states = count ?? 0;
        }

        // 4. Clean expired ai_response_cache
        {
          const now = new Date().toISOString();
          const { count } = await supabaseAdmin
            .from("ai_response_cache")
            .delete({ count: "exact" })
            .lt("expires_at", now);
          results.ai_response_cache = count ?? 0;
        }

        // 5. Prune dead push subscriptions (no updates in 90 days)
        {
          const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("push_subscriptions")
            .delete({ count: "exact" })
            .lt("updated_at", cutoff);
          results.push_subscriptions = count ?? 0;
        }

        return Response.json({
          ok: true,
          cleaned: results,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
