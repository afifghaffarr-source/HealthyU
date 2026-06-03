import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("food_scans")
      .select("id, detected_foods, total_calories, avg_confidence, model_version, was_logged, created_at")
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
    z.object({ meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional() }).parse(input),
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { summary: "AI tidak aktif.", tips: [] as string[] };
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
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return { summary: `Rata-rata ${avg.cal} kkal/hari`, tips: [] as string[] };
      const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { summary?: string; tips?: string[] };
      return {
        summary: parsed.summary ?? `Rata-rata ${avg.cal} kkal/hari`,
        tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
      };
    } catch {
      return { summary: `Rata-rata ${avg.cal} kkal/hari`, tips: [] as string[] };
    }
  });