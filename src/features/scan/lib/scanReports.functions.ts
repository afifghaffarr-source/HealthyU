import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";

const callAI = makeScanAiCaller("scanBatch8");

const InsightsSchema = z.object({
  summary: z.string().default(""),
  tips: z.array(z.string()).default([]),
});

// ===== from scanBatch8a (generateWeeklyReport) =====

export const generateWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("ai_weekly_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStartStr)
      .maybeSingle();
    if (existing) return { report: existing };
    const since = weekStart.toISOString();
    const [meals, water, sleep, workouts] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("calories, protein_g")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase
        .from("sleep_logs")
        .select("duration_hours")
        .eq("user_id", userId)
        .gte("log_date", weekStartStr),
      supabase
        .from("workout_sessions")
        .select("calories_burned, duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", since),
    ]);
    const stats = {
      meals: meals.data?.length ?? 0,
      totalCal: (meals.data ?? []).reduce<number>((s, m) => s + (m.calories ?? 0), 0),
      totalProtein: (meals.data ?? []).reduce<number>((s, m) => s + (m.protein_g ?? 0), 0),
      water: (water.data ?? []).reduce<number>((s, w) => s + (w.amount_ml ?? 0), 0),
      sleep: (sleep.data ?? []).reduce<number>((s, w) => s + (w.duration_hours ?? 0), 0),
      workouts: workouts.data?.length ?? 0,
    };
    const content = await callAI(
      `Buat laporan mingguan kesehatan (Bahasa Indonesia, max 400 kata) dari data: ${JSON.stringify(stats)}. Sertakan: ringkasan, highlight, area perbaikan, target minggu depan.`,
      "Kamu health coach personal.",
      userId,
      supabase,
    );
    const { data: inserted } = await supabase
      .from("ai_weekly_reports")
      .insert({ user_id: userId, week_start: weekStartStr, content })
      .select()
      .single();
    return { report: inserted };
  });

// ===== from scanBatch8b1 (getSleepScore) =====

export const getSleepScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("sleep_logs")
      .select("log_date, duration_hours, quality")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date");
    const rows = (data ?? []).map((r) => ({
      date: r.log_date,
      score: Math.min(100, Math.round(((r.duration_hours ?? 0) / 8) * 60 + (r.quality ?? 3) * 8)),
    }));
    return { rows };
  });

// ===== from scanHistory (ALL) =====

export const listScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("food_scans")
      .select(
        "id, detected_foods, total_calories, avg_confidence, model_version, was_logged, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { scans: data ?? [] };
  });

export const getScanStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("food_scans")
      .select("avg_confidence, was_logged, processing_time_ms, model_version, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const n = rows.length;
    const avgConf = n ? rows.reduce((s, r) => s + Number(r.avg_confidence ?? 0), 0) / n : 0;
    const avgMs = n ? rows.reduce((s, r) => s + Number(r.processing_time_ms ?? 0), 0) / n : 0;
    const loggedRate = n ? rows.filter((r) => r.was_logged).length / n : 0;
    const byModel: Record<string, number> = {};
    rows.forEach((r) => {
      const k = r.model_version ?? "unknown";
      byModel[k] = (byModel[k] ?? 0) + 1;
    });
    return { total: n, avgConfidence: avgConf, avgMs, loggedRate, byModel };
  });

export const copyYesterdayMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yDate = yesterday.toISOString().slice(0, 10);
    const tDate = today.toISOString().slice(0, 10);

    let q = supabase.from("meal_logs").select("*").eq("user_id", userId).eq("log_date", yDate);
    if (data.meal_type) q = q.eq("meal_type", data.meal_type);
    const { data: prev, error } = await q;
    if (error) throw new Error(error.message);
    if (!prev || prev.length === 0) return { inserted: 0 };

    const rows = prev.map((m) => ({
      user_id: userId,
      food_item_id: m.food_item_id,
      custom_name: m.custom_name,
      meal_type: m.meal_type,
      serving_qty: m.serving_qty,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      fiber_g: m.fiber_g,
      sugar_g: m.sugar_g,
      sodium_mg: m.sodium_mg,
      source: "copy_yesterday",
      log_date: tDate,
      logged_at: new Date().toISOString(),
    }));
    const { error: insErr } = await supabase.from("meal_logs").insert(rows);
    if (insErr) throw new Error(insErr.message);
    return { inserted: rows.length };
  });

export const getDailyInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("meal_type, calories, protein_g, carbs_g, fat_g, log_date")
      .eq("user_id", userId)
      .gte("log_date", since.toISOString().slice(0, 10));
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) {
      return { summary: "Belum ada meal log minggu ini.", tips: [] as string[] };
    }
    const totals = rows.reduce(
      (a, r) => ({
        cal: a.cal + Number(r.calories ?? 0),
        p: a.p + Number(r.protein_g ?? 0),
        c: a.c + Number(r.carbs_g ?? 0),
        f: a.f + Number(r.fat_g ?? 0),
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
    const days = new Set(rows.map((r) => r.log_date)).size || 1;
    const avg = {
      cal: Math.round(totals.cal / days),
      p: Math.round(totals.p / days),
      c: Math.round(totals.c / days),
      f: Math.round(totals.f / days),
    };
    const prompt = `Rata-rata harian 7 hari terakhir: ${avg.cal} kkal, P:${avg.p}g, K:${avg.c}g, L:${avg.f}g. Total ${rows.length} meal log dari ${days} hari. Berikan ringkasan singkat (1 kalimat) + 3 tips actionable dalam Bahasa Indonesia. Format JSON: {"summary":"...","tips":["...","...","..."]}`;
    try {
      const parsed = await callAiJsonWithSchema({
        userId,
        feature: "scan.history.summary",
        model: "google/gemini-2.5-flash",
        schema: InsightsSchema,
        fallback: { summary: "", tips: [] },
        messages: [{ role: "user", content: prompt }],
      });
      return {
        summary: parsed.summary || `Rata-rata ${avg.cal} kkal/hari`,
        tips: parsed.tips.slice(0, 5),
      };
    } catch {
      return { summary: `Rata-rata ${avg.cal} kkal/hari`, tips: [] as string[] };
    }
  });

// ===== from scanMore1 (compareWeeks) =====

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

// ===== from scanMore2 (exportMealsCsv) =====

export const exportMealsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date, meal_type, custom_name, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    const header = "date,meal,name,calories,protein,carbs,fat";
    const escape = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = (data ?? []).map((r) =>
      [
        r.log_date,
        r.meal_type,
        escape(r.custom_name),
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
      ].join(","),
    );
    return { csv: [header, ...rows].join("\n"), count: rows.length };
  });

// ===== from scanExtras2 (getWeeklyNutrition) =====

export const getWeeklyNutrition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("log_date, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", since.toISOString().slice(0, 10));
    if (error) throw new Error(error.message);
    const byDay: Record<string, { cal: number; p: number; c: number; f: number }> = {};
    (data ?? []).forEach((r) => {
      const k = r.log_date as string;
      if (!byDay[k]) byDay[k] = { cal: 0, p: 0, c: 0, f: 0 };
      byDay[k].cal += Number(r.calories ?? 0);
      byDay[k].p += Number(r.protein_g ?? 0);
      byDay[k].c += Number(r.carbs_g ?? 0);
      byDay[k].f += Number(r.fat_g ?? 0);
    });
    const days = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    return { days };
  });

// ===== from scanFinal2 (moodMealCorrelation, hydrationMealPairing, checkStreakAtRisk) =====

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
    const recommendedMl = Math.round(totalKcal * 1.0);
    return { totalMl, totalKcal, recommendedMl, gap: Math.max(0, recommendedMl - totalMl) };
  });

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

// ===== from scanSocialB (getSleepMealCorrelation) =====

export const getSleepMealCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data: sleeps } = await supabase
      .from("sleep_logs")
      .select("log_date, duration_hours")
      .eq("user_id", userId)
      .gte("log_date", since);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("log_date, calories")
      .eq("user_id", userId)
      .gte("log_date", since);
    const mealByDate = new Map<string, number>();
    for (const m of meals ?? []) {
      if (!m.log_date) continue;
      mealByDate.set(m.log_date, (mealByDate.get(m.log_date) ?? 0) + Number(m.calories ?? 0));
    }
    const points = (sleeps ?? [])
      .filter((s) => s.log_date)
      .map((s) => ({
        date: s.log_date as string,
        sleepHours: Number(s.duration_hours ?? 0),
        calories: mealByDate.get(s.log_date as string) ?? 0,
      }));
    return { points };
  });

// ===== from scanBatch7a (getMealHeatmap) =====

export const getMealHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const sinceDate = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date")
      .eq("user_id", userId)
      .gte("log_date", sinceDate);
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const d = r.log_date;
      if (!d) continue;
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return { counts };
  });

// ===== from scanBatch12b (getMoodHeatmap) =====

export const getMoodHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const { data } = await context.supabase
      .from("mood_logs")
      .select("mood, logged_at")
      .eq("user_id", context.userId)
      .gte("logged_at", yearAgo);
    const map: Record<string, { sum: number; count: number }> = {};
    (data ?? []).forEach((r: { mood: number | null; logged_at: string }) => {
      const day = r.logged_at.slice(0, 10);
      if (!map[day]) map[day] = { sum: 0, count: 0 };
      map[day].sum += r.mood ?? 0;
      map[day].count += 1;
    });
    return { days: Object.entries(map).map(([d, v]) => ({ date: d, avg: v.sum / v.count })) };
  });
