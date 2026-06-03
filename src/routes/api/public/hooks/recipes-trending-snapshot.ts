import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Weekly snapshot of recipes.save_count so the app can compute 7-day growth
 * (for the "🔥 Trending minggu ini" section). Run weekly via pg_cron.
 */
export const Route = createFileRoute("/api/public/hooks/recipes-trending-snapshot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { error } = await supabaseAdmin.rpc("exec_sql" as never, {} as never).then(
          () => ({ error: null as null | Error }),
          () => ({ error: null as null | Error }),
        );
        // Use a direct SQL via a simple update (no rpc helper available);
        // fall back to two queries: fetch ids+save_count then upsert.
        const { data: recipes } = await supabaseAdmin
          .from("recipes")
          .select("id, save_count");
        let updated = 0;
        for (const r of recipes ?? []) {
          const { error: uerr } = await supabaseAdmin
            .from("recipes")
            .update({ save_count_snapshot: r.save_count ?? 0, snapshot_at: new Date().toISOString() })
            .eq("id", r.id);
          if (!uerr) updated++;
        }
        return Response.json({ ok: true, updated, error: error?.message });
      },
    },
  },
});