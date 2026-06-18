/**
 * Admin system health server function.
 * Reports on cron jobs, backups, AI usage, and database stats.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getEnv } from "@/lib/cloudflare-env.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const InputSchema = z.object({}).strict();

export type CronHealth = {
  name: string;
  schedule: string;
  lastRunAt: string | null;
  lastStatus: "success" | "failure" | "never" | "unknown";
  description: string;
};

export type BackupHealth = {
  lastBackupAt: string | null;
  backupSizeKb: number | null;
  retentionDays: number;
};

export type SystemHealth = {
  generatedAt: string;
  app: {
    name: string;
    url: string;
    environment: string;
  };
  database: {
    projectRef: string;
    region: string;
    tablesCount: number;
    totalRows: number;
  };
  ai: {
    last24h: number;
    last7d: number;
    totalCostUsd: number;
    byFeature: Array<{ feature: string; calls: number; cost_usd: number }>;
  };
  cron: CronHealth[];
  backup: BackupHealth;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const getSystemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(InputSchema, i))
  .handler(async ({ context }): Promise<SystemHealth> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const env = getEnv();

    // AI usage from ai_usage_logs (real table)
    const dayAgo = new Date(Date.now() - 86400e3).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString();

    const [{ count: c1 }, { count: c2 }, { data: recentAiRows }, { data: weekAiRows }] =
      await Promise.all([
        supabaseAdmin
          .from("ai_usage_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", dayAgo),
        supabaseAdmin
          .from("ai_usage_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        supabaseAdmin
          .from("ai_usage_logs")
          .select("feature, cost_usd, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("ai_usage_logs")
          .select("feature, cost_usd")
          .gte("created_at", weekAgo)
          .limit(2000),
      ]);

    const aiLast24h = c1 ?? 0;
    const aiLast7d = c2 ?? 0;

    // Aggregate by feature over 7d
    const featureMap = new Map<string, { calls: number; cost_usd: number }>();
    let totalCostUsd = 0;
    for (const row of weekAiRows ?? []) {
      const f = row.feature ?? "unknown";
      const cost = Number(row.cost_usd ?? 0);
      const entry = featureMap.get(f) ?? { calls: 0, cost_usd: 0 };
      entry.calls += 1;
      entry.cost_usd += cost;
      featureMap.set(f, entry);
      totalCostUsd += cost;
    }

    const byFeature = Array.from(featureMap.entries())
      .map(([feature, v]) => ({ feature, ...v }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    // Database stats (best-effort). The RPC isn't typed, so coerce.
    let tablesCount = 0;
    let totalRows = 0;
    try {
      const result = await supabaseAdmin.rpc("get_public_tables" as never, {} as never);
      const tablesList = (result.data ?? []) as Array<{ row_count?: number }>;
      tablesCount = tablesList.length;
      totalRows = tablesList.reduce((s, t) => s + (t.row_count ?? 0), 0);
    } catch {
      // RPC not defined — leave zeros
    }

    const envName = String(env.SITE_NAME ?? "HealthyU");
    const envUrl = String(env.SITE_URL ?? "https://healthyu.web.id");
    const envEnv = String(env.NODE_ENV ?? "production");

    return {
      generatedAt: new Date().toISOString(),
      app: {
        name: envName,
        url: envUrl,
        environment: envEnv,
      },
      database: {
        projectRef: "ohkfcldkuzfcxnpqvdvc",
        region: "ap-southeast-1",
        tablesCount,
        totalRows,
      },
      ai: {
        last24h: aiLast24h,
        last7d: aiLast7d,
        totalCostUsd: Math.round(totalCostUsd * 1e6) / 1e6,
        byFeature,
      },
      cron: [
        {
          name: "backup_supabase",
          schedule: "0 3 * * * (daily 03:00 UTC)",
          lastRunAt: null,
          lastStatus: "unknown",
          description: "Daily pg_dump → ~/backups/healthyu/",
        },
        {
          name: "backup_retention",
          schedule: "30 3 * * * (daily 03:30 UTC)",
          lastRunAt: null,
          lastStatus: "unknown",
          description: "Clean backups older than retention policy",
        },
        {
          name: "seed_recipes",
          schedule: "0 2 * * 1 (Monday 02:00 UTC)",
          lastRunAt: null,
          lastStatus: "unknown",
          description: "Generate 3 new recipes via VexoAPI",
        },
      ],
      backup: {
        lastBackupAt: null,
        backupSizeKb: null,
        retentionDays: 30,
      },
    };
  });
