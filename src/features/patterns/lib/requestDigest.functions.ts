/**
 * Weekly Digest — on-demand user request
 *
 * Sprint 18 alternative to cron-driven mass-email. User clicks button on
 * dashboard. Single-user send (vs admin scan-all), so safe for free tier.
 *
 * ponytail:
 * - No cron slot (cron 3/3 at capacity)
 * - No KV write — rate limit via last-sent-at column on profile (optional)
 * - Auth-gated, single user, single email per click
 * - Reuses digestEmail renderers from lib/digestEmail.ts
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEnv } from "@/lib/cloudflare-env.server";
import { renderDigestHTML, renderDigestText } from "./digestEmail";

interface DigestPattern {
  type: string;
  explanation: string;
}

interface DigestResult {
  sent: boolean;
  reason?: string;
  patternCount?: number;
  emailDomain?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const requestWeeklyDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DigestResult> => {
    const { supabase, userId } = context;

    const env = getEnv();
    if (!env.RESEND_API_KEY) {
      return { sent: false, reason: "RESEND_API_KEY not configured" };
    }

    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    const { data: patterns, error } = await supabase
      .from("pattern_insights")
      .select("pattern_type, ai_explanation, urgency_score")
      .eq("user_id", userId)
      .gte("detected_at", sevenDaysAgo)
      .is("resolved_at", null)
      .order("urgency_score", { ascending: false })
      .limit(3);

    if (error) {
      console.error("[Digest] Query failed:", error);
      return { sent: false, reason: "Query failed" };
    }

    if (!patterns || patterns.length === 0) {
      return { sent: false, reason: "No active patterns this week", patternCount: 0 };
    }

    // Current authenticated user's email — no admin listUsers needed.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return { sent: false, reason: "No email on profile" };
    }

    const digestPatterns: DigestPattern[] = patterns.map((p) => ({
      type: p.pattern_type,
      explanation: p.ai_explanation,
    }));

    try {
      await sendEmail(user.email, digestPatterns);
      return { sent: true, patternCount: digestPatterns.length };
    } catch (err) {
      // PII masking in error logs — never log full email
      const emailDomain = user.email.split("@")[1] ?? "unknown";
      console.error(`[Digest] Send failed for ***@${emailDomain}:`, err);
      return { sent: false, reason: "Send failed", emailDomain };
    }
  });

async function sendEmail(to: string, patterns: DigestPattern[]): Promise<void> {
  const env = getEnv();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "HealthyU <noreply@healthyu.web.id>",
      to: [to],
      subject: "📊 Ringkasan Pola Makan Mingguan",
      text: renderDigestText(patterns),
      html: renderDigestHTML(patterns),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }
}
