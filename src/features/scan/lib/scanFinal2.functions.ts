import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ============ Mood × meal correlation ============
export const moodMealCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: moods } = await supabase
      .from("mood_logs")
      .select("log_date, mood")
      .eq("user_id", userId)
      .gte("log_date", since);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("log_date, calories, sugar_g")
      .eq("user_id", userId)
      .gte("log_date", since);
    const byDate = new Map<string, { kcal: number; sugar: number }>();
    for (const m of meals ?? []) {
      if (!m.log_date) continue;
      const cur = byDate.get(m.log_date) ?? { kcal: 0, sugar: 0 };
      cur.kcal += Number(m.calories ?? 0);
      cur.sugar += Number(m.sugar_g ?? 0);
      byDate.set(m.log_date, cur);
    }
    const points = (moods ?? [])
      .filter((m) => m.log_date)
      .map((m) => ({
        date: m.log_date as string,
        mood: m.mood,
        kcal: byDate.get(m.log_date as string)?.kcal ?? 0,
        sugar: byDate.get(m.log_date as string)?.sugar ?? 0,
      }));
    return { points };
  });

// ============ Hydration × meal pairing ============
export const hydrationMealPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: water } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("log_date", today);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("calories")
      .eq("user_id", userId)
      .gte("log_date", today);
    const totalMl = (water ?? []).reduce((s, w) => s + Number(w.amount_ml ?? 0), 0);
    const totalKcal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
    // recommendation: ~30ml per kcal/100
    const recommendedMl = Math.round(totalKcal * 1.0);
    return { totalMl, totalKcal, recommendedMl, gap: Math.max(0, recommendedMl - totalMl) };
  });

// ============ Streak freeze auto-suggest ============
export const checkStreakAtRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current, health_coins, streak_freeze_used_at")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) return { atRisk: false };
    const last = prof.last_scan_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const atRisk =
      last === yesterday &&
      (prof.scan_streak_current ?? 0) >= 3 &&
      prof.streak_freeze_used_at !== today;
    return {
      atRisk,
      streak: prof.scan_streak_current ?? 0,
      canFreeze: (prof.health_coins ?? 0) >= 30,
    };
  });

// ============ Smart shopping IDR estimate ============
export const estimateGroceryCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: string[] }) =>
    z.object({ items: z.array(z.string().min(1).max(100)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const text = await callAiWithGuards({
      userId,
      feature: "grocery.cost.estimate",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Estimasi harga pasar Indonesia 2026 untuk bahan groceries. JSON array: [{item, estimatedIdr, note}].",
        },
        { role: "user", content: `Items: ${JSON.stringify(data.items)}` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    let estimates: Array<{ item: string; estimatedIdr: number; note?: string }> = [];
    try {
      estimates = m ? JSON.parse(m[0]) : [];
    } catch {}
    const totalIdr = estimates.reduce((s, e) => s + Number(e.estimatedIdr || 0), 0);
    return { estimates, totalIdr };
  });

// ============ Currency convert (multi-currency) ============
const RATES: Record<string, number> = {
  IDR: 1,
  USD: 1 / 15800,
  MYR: 1 / 3500,
  SGD: 1 / 11800,
  EUR: 1 / 17000,
};
export function convertIdr(amountIdr: number, code: string): number {
  const r = RATES[code] ?? 1;
  return Math.round(amountIdr * r * 100) / 100;
}

// ============ Family plan ============
export const createFamilyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string }) =>
    z.object({ name: z.string().min(1).max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: plan, error } = await supabase
      .from("family_plans")
      .insert({ owner_id: userId, name: data.name ?? "Keluarga" })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("family_plan_members").insert({ plan_id: plan.id, user_id: userId });
    return { plan };
  });

export const listMyFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("family_plan_members")
      .select("plan_id, family_plans(id, name, owner_id)")
      .eq("user_id", userId);
    return { plans: memberships ?? [] };
  });
