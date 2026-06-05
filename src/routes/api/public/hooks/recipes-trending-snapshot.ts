import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/cronAuth.server";

/**
 * Weekly snapshot of recipes.save_count so the app can compute 7-day growth
 * (for the "🔥 Trending minggu ini" section). Run weekly via pg_cron.
 * Auth: x-cron-secret / Authorization: Bearer CRON_SECRET (see docs/cron.md).
 */
export const Route = createFileRoute("/api/public/hooks/recipes-trending-snapshot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;
        const { data: recipes } = await supabaseAdmin.from("recipes").select("id, save_count");
        let updated = 0;
        for (const r of recipes ?? []) {
          const { error: uerr } = await supabaseAdmin
            .from("recipes")
            .update({
              save_count_snapshot: r.save_count ?? 0,
              snapshot_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          if (!uerr) updated++;
        }
        return Response.json({ ok: true, updated });
      },
    },
  },
});
