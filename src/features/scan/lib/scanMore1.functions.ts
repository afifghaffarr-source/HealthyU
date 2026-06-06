import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ============ 1, 12, 13: streak + achievements + coins ============
export const recordScanGameify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_streak_current, scan_streak_longest, last_scan_date, health_coins")
      .eq("id", userId)
      .maybeSingle();
    let streak = prof?.scan_streak_current ?? 0;
    let longest = prof?.scan_streak_longest ?? 0;
    const last = prof?.last_scan_date;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      await supabase
        .from("profiles")
        .update({
          scan_streak_current: streak,
          scan_streak_longest: longest,
          last_scan_date: today,
          health_coins: (prof?.health_coins ?? 0) + 5,
        })
        .eq("id", userId);
    }
    // Achievement check
    const { count: mealCount } = await supabase
      .from("meal_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const unlocked: string[] = [];
    const checks: Array<{ id: string; ok: boolean }> = [
      { id: "scan_streak_7", ok: streak >= 7 },
      { id: "scan_streak_30", ok: streak >= 30 },
      { id: "meals_100", ok: (mealCount ?? 0) >= 100 },
      { id: "meals_500", ok: (mealCount ?? 0) >= 500 },
    ];
    for (const c of checks) {
      if (!c.ok) continue;
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: c.id });
      if (!error) unlocked.push(c.id);
    }
    return { streak, longest, unlocked, coinsAwarded: last !== today ? 5 : 0 };
  });

// ============ 20: scan limit gate ============
export const checkScanLimit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: prof }, { count }] = await Promise.all([
      supabase.from("profiles").select("daily_scan_limit").eq("id", userId).maybeSingle(),
      supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`),
    ]);
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const isPro = !!sub;
    const limit = isPro ? 9999 : (prof?.daily_scan_limit ?? 10);
    const used = count ?? 0;
    return { used, limit, remaining: Math.max(0, limit - used), isPro };
  });

// ============ 4: AI meal coach ============
export const mealCoachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ message: z.string().min(1).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data: logs } = await supabase
      .from("meal_logs")
      .select("custom_name, meal_type, calories, protein_g, carbs_g, fat_g, log_date")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false })
      .limit(50);
    const ctx = (logs ?? [])
      .map(
        (l) =>
          `${l.log_date} ${l.meal_type}: ${l.custom_name ?? "meal"} (${l.calories}kkal P${l.protein_g} K${l.carbs_g} L${l.fat_g})`,
      )
      .join("\n");
    const reply = await callAiWithGuards({
      userId,
      feature: "meal.coach.chat",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Anda meal coach. Riwayat 7 hari user:\n${ctx || "(belum ada)"}\nJawab ringkas Bahasa Indonesia, actionable, max 3 paragraf.`,
        },
        { role: "user", content: data.message },
      ],
    });
    return { reply };
  });

// ============ 10: compare week ============
export const compareWeeks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const startThis = new Date(today);
    startThis.setDate(today.getDate() - 6);
    const startLast = new Date(today);
    startLast.setDate(today.getDate() - 13);
    const endLast = new Date(today);
    endLast.setDate(today.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", fmt(startLast));
    const agg = (from: string, to: string) => {
      const f = (data ?? []).filter(
        (r) => (r.log_date as string) >= from && (r.log_date as string) <= to,
      );
      return f.reduce(
        (a, r) => ({
          cal: a.cal + Number(r.calories ?? 0),
          p: a.p + Number(r.protein_g ?? 0),
          c: a.c + Number(r.carbs_g ?? 0),
          f: a.f + Number(r.fat_g ?? 0),
        }),
        { cal: 0, p: 0, c: 0, f: 0 },
      );
    };
    return {
      thisWeek: agg(fmt(startThis), fmt(today)),
      lastWeek: agg(fmt(startLast), fmt(endLast)),
    };
  });
