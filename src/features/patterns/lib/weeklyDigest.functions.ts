/**
 * Weekly Pattern Digest Email
 * Sprint 10b+ enhancement
 *
 * Ponytail: API endpoint (no cron slot needed)
 * Trigger: Manual or external scheduler (GitHub Actions, cron-job.org)
 * Cloudflare Email Workers: 100 emails/day free
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

interface DigestResult {
  sent: number;
  skipped: number;
  errors: string[];
}

export const sendWeeklyDigests = createServerFn({ method: "POST" }).handler(
  async ({ context }): Promise<DigestResult> => {
    // Note: Auth should be handled at network level (Cloudflare Access)
    // This endpoint is designed to be called by GitHub Actions cron

    // @ts-expect-error - cloudflare env typing
    const env = context.cloudflare?.env;
    if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get patterns from last 7 days, group by user
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: patterns, error } = await supabase
      .from("pattern_insights")
      .select("user_id, pattern_type, ai_explanation, urgency_score, users!inner(email)")
      .gte("detected_at", sevenDaysAgo)
      .is("resolved_at", null)
      .order("urgency_score", { ascending: false });

    if (error || !patterns) {
      return { sent: 0, skipped: 0, errors: [error?.message || "Query failed"] };
    }

    // Group by user, top 3 per user
    const digestMap = new Map<
      string,
      { email: string; patterns: Array<{ type: string; explanation: string; urgency: number }> }
    >();

    for (const p of patterns) {
      const userId = p.user_id;
      if (!digestMap.has(userId)) {
        // Supabase join returns users object
        const userEmail = (p.users as unknown as { email: string }).email;
        digestMap.set(userId, { email: userEmail, patterns: [] });
      }
      const digest = digestMap.get(userId)!;
      if (digest.patterns.length < 3) {
        digest.patterns.push({
          type: p.pattern_type,
          explanation: p.ai_explanation,
          urgency: p.urgency_score,
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
        console.error(`[Digest] Failed for ${digest.email}:`, err);
        errors.push(`${digest.email}: ${(err as Error).message}`);
        skipped++;
      }
    }

    return { sent, skipped, errors };
  },
);

async function sendEmail(
  email: string,
  patterns: Array<{ type: string; explanation: string; urgency: number }>,
): Promise<void> {
  const html = renderHTML(patterns);
  const text = renderText(patterns);

  // MailChannels (free via Cloudflare Email Workers)
  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: "noreply@healthyu.web.id", name: "HealthyU" },
      subject: "📊 Ringkasan Pola Makan Mingguan",
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MailChannels error ${response.status}: ${body}`);
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
