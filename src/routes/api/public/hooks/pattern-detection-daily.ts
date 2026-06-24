import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { getUsersNeedingAnalysis } from "@/features/patterns/lib/patternTrigger.server";
import { detectPatternsForUser } from "@/features/patterns/services/patternDetection.server";
import { saveAnalysisCache } from "@/features/patterns/lib/patternTrigger.server";

/**
 * Cron: pattern-detection-daily
 *
 * Sprint 10b — Pattern Detection AI cron worker.
 *
 * Runs daily to analyze user eating patterns for the past 14 days.
 * Smart trigger: only processes users with 3+ new meals OR 24h since last analysis.
 *
 * Schedule: daily at 04:00 UTC (after account deletions at 03:00).
 * See docs/cron.md for SQL setup.
 *
 * Response shape:
 *   { ok, analyzed, skipped, errors, timestamp }
 */

export const Route = createFileRoute("/api/public/hooks/pattern-detection-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
          // Get users needing analysis (smart trigger: 3+ meals OR 24h)
          const userIds = await getUsersNeedingAnalysis(supabaseAdmin, 100);

          if (userIds.length === 0) {
            return Response.json({
              ok: true,
              analyzed: 0,
              skipped: 0,
              errors: [],
              timestamp,
              duration_ms: Date.now() - startTime,
            });
          }

          const results = {
            analyzed: 0,
            skipped: 0,
            errors: [] as Array<{ user_id: string; error: string }>,
          };

          // Process each user
          for (const userId of userIds) {
            try {
              const result = await detectPatternsForUser(supabaseAdmin, userId);

              if (result.detected_count > 0) {
                // Save cache (24h TTL)
                await saveAnalysisCache(supabaseAdmin, userId, {
                  detected_count: result.detected_count,
                  top_pattern: result.top_pattern,
                });

                results.analyzed++;
              } else {
                results.skipped++;
              }
            } catch (error) {
              results.errors.push({
                user_id: userId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return Response.json({
            ok: true,
            ...results,
            timestamp,
            duration_ms: Date.now() - startTime,
          });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp,
              duration_ms: Date.now() - startTime,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
