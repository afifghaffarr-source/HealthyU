import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { logServerError } from "@/lib/logger.server";

/**
 * Cron: daily-content
 * Picks 1 featured article + 1 featured recipe per day following the
 * 4-week theme calendar. Writes to daily_content_schedule. Idempotent
 * per date.
 * Auth: CRON_SECRET via `x-cron-secret` header or `Authorization: Bearer`.
 */

const THEMES = ["Diet Foundation", "Nutrition Deep Dive", "Puasa & Ramadan", "Mental & Recovery"];

function pick<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[seed % arr.length];
}

export const Route = createFileRoute("/api/public/hooks/daily-content")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const today = new Date();
        const date = today.toISOString().slice(0, 10);

        // Skip if already scheduled today
        const { data: existing } = await supabaseAdmin
          .from("daily_content_schedule")
          .select("id")
          .eq("schedule_date", date)
          .limit(1);
        if (existing && existing.length > 0) {
          return Response.json({ ok: true, skipped: true, date });
        }

        // Theme rotates weekly
        const weekOfMonth = Math.floor((today.getDate() - 1) / 7);
        const theme = THEMES[weekOfMonth % THEMES.length];
        // Day-of-year seed for deterministic pick
        const start = new Date(today.getFullYear(), 0, 0);
        const seed = Math.floor((+today - +start) / 86400000);

        const [{ data: arts }, { data: recs }] = await Promise.all([
          supabaseAdmin
            .from("articles")
            .select("id")
            .eq("is_published", true)
            .is("deleted_at", null),
          supabaseAdmin
            .from("recipes")
            .select("id")
            .eq("is_published", true)
            .is("deleted_at", null),
        ]);

        const rows: Array<{
          schedule_date: string;
          content_type: "article" | "recipe";
          content_id: string;
          theme: string;
          position: number;
        }> = [];
        const a = pick(arts ?? [], seed);
        const r = pick(recs ?? [], seed + 1);
        if (a)
          rows.push({
            schedule_date: date,
            content_type: "article",
            content_id: a.id,
            theme,
            position: 0,
          });
        if (r)
          rows.push({
            schedule_date: date,
            content_type: "recipe",
            content_id: r.id,
            theme,
            position: 0,
          });

        if (rows.length === 0) {
          return Response.json({ ok: true, scheduled: 0, date });
        }
        const { error } = await supabaseAdmin.from("daily_content_schedule").insert(rows);
        if (error) {
          // Sprint 37 — pass through sanitizeLogMeta so any Supabase
          // error metadata (hints, RLS context) gets redacted before
          // hitting CF Workers logs.
          logServerError("daily-content.insert", error);
          return new Response(error.message, { status: 500 });
        }
        return Response.json({ ok: true, scheduled: rows.length, theme, date });
      },
    },
  },
});
