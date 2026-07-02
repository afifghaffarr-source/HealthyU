/**
 * Admin AI cost analytics server function.
 * Returns daily spend for last 7 days + current month total + threshold.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";
import { readPublicConfig } from "./adminConfig.functions";

const InputSchema = z.object({}).strict();

export const getAiCostStats = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireSupabaseAuth({ isAdmin: true });
  const userId = auth.user.id;

  // ─── Fetch daily spend (last 7 days) ────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: rawData, error: dailyError } = await supabaseAdmin
    .from("ai_usage_logs")
    .select("created_at, cost_usd")
    .gte("created_at", sevenDaysAgo.toISOString())
    .eq("cache_hit", false);

  if (dailyError) {
    console.error("[adminCost] Daily cost fetch failed:", dailyError);
    throw new Error(`Failed to fetch daily AI cost: ${dailyError.message}`);
  }

  // Group by date
  const dailyMap = new Map<string, number>();
  for (const row of rawData || []) {
    const date = row.created_at.split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + (row.cost_usd || 0));
  }
  const dailySpend = Array.from(dailyMap.entries()).map(([date, cost]) => ({ date, cost }));

  // ─── Fetch current month total ───────────────────────────────────────────
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthData, error: monthError } = await supabaseAdmin
    .from("ai_usage_logs")
    .select("cost_usd")
    .gte("created_at", monthStart.toISOString())
    .eq("cache_hit", false);

  if (monthError) {
    console.error("[adminCost] Month cost fetch failed:", monthError);
    throw new Error(`Failed to fetch month AI cost: ${monthError.message}`);
  }

  const monthTotal =
    monthData?.reduce(
      (sum: number, row: { cost_usd: number | null }) => sum + (row.cost_usd || 0),
      0,
    ) || 0;

  // ─── Fetch cost threshold from config ────────────────────────────────────
  const thresholdValue = await readPublicConfig({
    data: { key: "ai.cost_alert_threshold_usd" },
  });
  const threshold = Number(thresholdValue || 50);

  return {
    dailySpend,
    monthTotal,
    threshold,
    generatedAt: new Date().toISOString(),
  };
});
