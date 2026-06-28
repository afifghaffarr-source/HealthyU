import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  runWeeklyReportForUser,
  sendWeeklyReportPush,
  getTopTrendingRecipe,
} from "@/features/reports/lib/weeklyReportRunner.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { logServerError } from "@/lib/logger.server";

/**
 * Weekly AI report scheduler. Runs every Sunday morning via pg_cron.
 * Auth: x-cron-secret / Authorization: Bearer CRON_SECRET (see docs/cron.md).
 * For each user active in the last 14 days who has not received a weekly
 * report in the last 5 days, generate a new AI report + push.
 */
export const Route = createFileRoute("/api/public/hooks/weekly-ai-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
        const since5 = new Date(Date.now() - 5 * 86400000).toISOString();

        // Active users: anyone with a meal log in last 14 days
        const { data: activeRows } = await supabaseAdmin
          .from("meal_logs")
          .select("user_id")
          .gte("logged_at", since14)
          .limit(5000);
        const activeIds = Array.from(new Set((activeRows ?? []).map((r) => r.user_id)));

        // Already-run recently
        const { data: recent } = await supabaseAdmin
          .from("weekly_report_runs")
          .select("user_id")
          .gte("run_at", since5);
        const recentSet = new Set((recent ?? []).map((r) => r.user_id));

        const targets = activeIds.filter((id) => !recentSet.has(id));

        const trending = await getTopTrendingRecipe();
        const trendingTitle = trending?.title ?? null;

        let processed = 0;
        let failed = 0;
        for (const uid of targets) {
          try {
            const { reportId, highlight, longestStreak } = await runWeeklyReportForUser(uid, 7);
            await supabaseAdmin
              .from("weekly_report_runs")
              .insert({ user_id: uid, report_id: reportId });
            await sendWeeklyReportPush(uid, highlight, trendingTitle, longestStreak);
            processed++;
          } catch (e) {
            failed++;
            // Sprint 38 — uid goes through sanitizeLogMeta (matches "id" fragment).
            logServerError("weekly-report.fail", e as Error, { user_id: uid });
          }
        }

        return Response.json({
          ok: true,
          active: activeIds.length,
          processed,
          failed,
          skipped: activeIds.length - targets.length,
        });
      },
    },
  },
});
