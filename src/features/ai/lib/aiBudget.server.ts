import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Rough per-1k-token prices (USD). Update as Lovable pricing changes.
const MODEL_PRICE: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.000075, out: 0.0003 },
  "google/gemini-2.5-flash-lite": { in: 0.00004, out: 0.00015 },
  "google/gemini-2.5-pro": { in: 0.00125, out: 0.005 },
  "google/gemini-3-flash-preview": { in: 0.000075, out: 0.0003 },
};

export type AiUsageRecord = {
  userId: string | null;
  feature: string;
  tier?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  cacheHit?: boolean;
  wasDowngraded?: boolean;
};

export function estimateCost(model: string, prompt = 0, completion = 0): number {
  const p = MODEL_PRICE[model] ?? { in: 0.0001, out: 0.0003 };
  return +((prompt / 1000) * p.in + (completion / 1000) * p.out).toFixed(6);
}

/** Fire-and-forget log of one AI call. Never throws. */
export async function logAiUsage(rec: AiUsageRecord): Promise<void> {
  try {
    const total = (rec.promptTokens ?? 0) + (rec.completionTokens ?? 0);
    const cost = rec.cacheHit
      ? 0
      : estimateCost(rec.model ?? "", rec.promptTokens, rec.completionTokens);
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: rec.userId,
      feature: rec.feature,
      tier: rec.tier ?? null,
      model: rec.model ?? null,
      prompt_tokens: rec.promptTokens ?? 0,
      completion_tokens: rec.completionTokens ?? 0,
      total_tokens: total,
      cost_usd: cost,
      cache_hit: !!rec.cacheHit,
      was_downgraded: !!rec.wasDowngraded,
    });
  } catch (e) {
    console.error("logAiUsage failed", (e as Error).message);
  }
}

export type AiBudgetDecision = {
  allowed: boolean;
  reason?: "rate_hour" | "token_day";
  shouldDowngrade: boolean;
  retryAfterSec?: number;
};

/**
 * Soft rate-limit per user. Counts ai_usage_logs (excluding cache hits).
 * - Free tier: 10 req/hour, 10k tokens/day
 * - Premium:   50 req/hour, 50k tokens/day
 * Returns shouldDowngrade=true when near limit (>=80%) so callers can pick a cheaper tier.
 */
export async function enforceAiBudget(
  userId: string,
  isPremium = false,
): Promise<AiBudgetDecision> {
  const HOUR_LIMIT = isPremium ? 50 : 10;
  const DAY_TOKEN_LIMIT = isPremium ? 50_000 : 10_000;
  const sinceHour = new Date(Date.now() - 3600_000).toISOString();
  const sinceDay = new Date(Date.now() - 86_400_000).toISOString();

  const [hourRes, dayRes] = await Promise.all([
    supabaseAdmin
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("cache_hit", false)
      .gte("created_at", sinceHour),
    supabaseAdmin
      .from("ai_usage_logs")
      .select("total_tokens")
      .eq("user_id", userId)
      .eq("cache_hit", false)
      .gte("created_at", sinceDay),
  ]);

  const hourCalls = hourRes.count ?? 0;
  const dayTokens = (dayRes.data ?? []).reduce((s, r) => s + (r.total_tokens ?? 0), 0);

  if (hourCalls >= HOUR_LIMIT) {
    return { allowed: false, reason: "rate_hour", shouldDowngrade: false, retryAfterSec: 3600 };
  }
  if (dayTokens >= DAY_TOKEN_LIMIT) {
    return { allowed: false, reason: "token_day", shouldDowngrade: false, retryAfterSec: 86400 };
  }
  const nearLimit =
    hourCalls >= Math.floor(HOUR_LIMIT * 0.8) || dayTokens >= Math.floor(DAY_TOKEN_LIMIT * 0.8);
  return { allowed: true, shouldDowngrade: nearLimit };
}
