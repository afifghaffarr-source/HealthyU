/**
 * Admin audit log server function.
 * Reads privacy events from account_deletion_requests + AI usage from ai_usage_logs.
 * Unified view since the project doesn't yet have a generic audit_events table.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const ListInputSchema = z.object({
  category: z.string().max(50).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export type AuditEvent = {
  id: string;
  created_at: string;
  actor_id: string | null;
  category: string;
  action: string;
  target_id: string | null;
  meta: Record<string, string | number | boolean | null>;
};

export type AuditResult = {
  items: AuditEvent[];
  total: number;
  categories: Array<{ category: string; count: number }>;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const listAuditEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ListInputSchema, i))
  .handler(async ({ data, context }): Promise<AuditResult> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    // Pull from two real tables: account_deletion_requests (privacy) + ai_usage_logs (AI)
    const [deletionRes, aiRes] = await Promise.all([
      supabaseAdmin
        .from("account_deletion_requests")
        .select("id, user_id, requested_at, processed_at, status, reason")
        .order("requested_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("ai_usage_logs")
        .select("id, user_id, feature, model, total_tokens, cost_usd, cache_hit, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const items: AuditEvent[] = [];

    // Privacy events
    for (const r of deletionRes.data ?? []) {
      const reason = r.reason ?? null;
      items.push({
        id: `del-${r.id}`,
        created_at: r.requested_at,
        actor_id: r.user_id,
        category: "privacy",
        action: "account_deletion_requested",
        target_id: r.user_id,
        meta: {
          status: r.status,
          processed_at: r.processed_at ?? null,
          reason,
        },
      });
    }

    // AI events (sampled, summarized)
    for (const r of aiRes.data ?? []) {
      items.push({
        id: `ai-${r.id}`,
        created_at: r.created_at,
        actor_id: r.user_id,
        category: "ai_call",
        action: r.feature,
        target_id: null,
        meta: {
          model: r.model ?? "unknown",
          total_tokens: r.total_tokens,
          cost_usd: r.cost_usd,
          cache_hit: r.cache_hit,
        },
      });
    }

    // Sort newest first
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const filtered = data.category ? items.filter((e) => e.category === data.category) : items;
    const sliced = filtered.slice(0, data.limit);

    // Category counts
    const catCounts = new Map<string, number>();
    for (const e of items) {
      catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1);
    }
    const categories = Array.from(catCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      items: sliced,
      total: filtered.length,
      categories,
    };
  });
