/**
 * Weekly Pattern Digest API Endpoint
 * Called by GitHub Actions cron (Monday 2am UTC)
 * (Sprint 18 also exposes a user-initiated on-demand path in
 *  src/features/patterns/lib/requestDigest.functions.ts — both share the
 *  same render helpers via lib/digestEmail.ts)
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/cloudflare-env.server";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { renderDigestHTML, renderDigestText } from "@/features/patterns/lib/digestEmail";

export const Route = createFileRoute("/api/sendWeeklyDigests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // SECURITY: this endpoint uses the service-role key (bypasses RLS) and
        // sends email to real users. It MUST validate the shared CRON_SECRET,
        // exactly like the other /api/public/hooks/* cron endpoints. Without
        // this guard, anyone on the internet could POST here and trigger a
        // mass email send (spam, cost, abuse). Fail-closed via requireCronSecret.
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const env = getEnv();

        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return new Response(
            JSON.stringify({ sent: 0, skipped: 0, errors: ["Missing credentials"] }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // Get patterns from last 7 days (no join — users table is auth.users,
        // not exposed via PostgREST; fetch emails separately via admin API)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: patterns, error } = await supabase
          .from("pattern_insights")
          .select("user_id, pattern_type, ai_explanation, urgency_score")
          .gte("detected_at", sevenDaysAgo)
          .is("resolved_at", null)
          .order("urgency_score", { ascending: false });

        if (error || !patterns) {
          return new Response(
            JSON.stringify({ sent: 0, skipped: 0, errors: [error?.message || "Query failed"] }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        if (patterns.length === 0) {
          return new Response(JSON.stringify({ sent: 0, skipped: 0, errors: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Fetch user emails via admin API (FK join impossible — no public.users table)
        const uniqueUserIds = Array.from(new Set(patterns.map((p) => p.user_id)));
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

        if (authError || !authData?.users) {
          return new Response(
            JSON.stringify({ sent: 0, skipped: 0, errors: ["Failed to fetch user emails"] }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const emailMap = new Map<string, string>();
        for (const u of authData.users) {
          if (uniqueUserIds.includes(u.id)) {
            emailMap.set(u.id, u.email || "");
          }
        }

        // Group by user (top 3 patterns per user)
        const digestMap = new Map<
          string,
          { user_id: string; email: string; patterns: Array<{ type: string; explanation: string }> }
        >();

        for (const p of patterns) {
          const userId = p.user_id;
          const email = emailMap.get(userId);
          if (!email) continue;

          if (!digestMap.has(userId)) {
            digestMap.set(userId, { user_id: userId, email, patterns: [] });
          }
          const digest = digestMap.get(userId)!;
          if (digest.patterns.length < 3) {
            digest.patterns.push({
              type: p.pattern_type,
              explanation: p.ai_explanation,
            });
          }
        }

        let sent = 0;
        let skipped = 0;
        const errors: string[] = [];

        // Send emails (max 100/day free tier)
        const digests = Array.from(digestMap.entries());
        for (const [userId, digest] of digests) {
          if (sent >= 100) {
            console.warn("[Digest] Hit daily limit (100)");
            skipped += digestMap.size - sent;
            break;
          }

          try {
            await sendEmail(digest.email, digest.patterns);
            sent++;
          } catch (err) {
            // Mask email for PII compliance - log only domain
            const emailDomain = digest.email.split("@")[1] || "unknown";
            console.error(`[Digest] Failed for ***@${emailDomain}:`, err);
            errors.push(`user_id=${digest.user_id}: ${(err as Error).message}`);
            skipped++;
          }
        }

        return new Response(JSON.stringify({ sent, skipped, errors }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

async function sendEmail(
  email: string,
  patterns: Array<{ type: string; explanation: string }>,
): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const html = renderDigestHTML(patterns);
  const text = renderDigestText(patterns);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "HealthyU <noreply@healthyu.web.id>",
      to: [email],
      subject: "📊 Ringkasan Pola Makan Mingguan",
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }
}
