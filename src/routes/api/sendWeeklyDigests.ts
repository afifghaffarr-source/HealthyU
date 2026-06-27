/**
 * Weekly Pattern Digest API Endpoint
 * Called by GitHub Actions cron (Monday 2am UTC)
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/cloudflare-env.server";
import { requireCronSecret } from "@/lib/cronAuth.server";

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

  const html = renderHTML(patterns);
  const text = renderText(patterns);

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

function renderHTML(patterns: Array<{ type: string; explanation: string }>): string {
  const rows = patterns
    .map(
      (p, i) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
        <strong>${i + 1}. ${formatType(p.type)}</strong><br/>
        <span style="color:#6b7280; font-size:14px;">${p.explanation.slice(0, 100)}...</span>
      </td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:20px">
    <h1 style="margin:0 0 8px;color:#059669">📊 Ringkasan Mingguan</h1>
    <p style="margin:0;color:#6b7280">Pola makan 7 hari terakhir</p>
  </div>
  <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    ${rows}
  </table>
  <div style="margin-top:24px;text-align:center">
    <a href="https://healthyu.web.id/profile/insights" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500">
      Lihat Detail
    </a>
  </div>
  <p style="margin-top:32px;font-size:12px;color:#9ca3af;text-align:center">
    HealthyU • <a href="https://healthyu.web.id" style="color:#059669">healthyu.web.id</a>
  </p>
</body>
</html>`.trim();
}

function renderText(patterns: Array<{ type: string; explanation: string }>): string {
  const lines = patterns.map(
    (p, i) => `${i + 1}. ${formatType(p.type)}\n   ${p.explanation.slice(0, 80)}...`,
  );
  return `
📊 Ringkasan Pola Makan Mingguan

${lines.join("\n\n")}

Lihat detail: https://healthyu.web.id/profile/insights

---
HealthyU • healthyu.web.id`.trim();
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    skip_breakfast: "Sering Skip Sarapan",
    late_night_eating: "Makan Malam Larut",
    irregular_meals: "Jadwal Tidak Teratur",
    stress_eating: "Makan Saat Stres",
    sugar_crashes: "Konsumsi Gula Berlebih",
    night_cravings: "Ngidam Malam Hari",
    busy_day_skips: "Skip Makan Saat Sibuk",
  };
  return map[type] || type.replace(/_/g, " ");
}
