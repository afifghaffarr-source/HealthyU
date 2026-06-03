import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPushTo } from "@/lib/push.server";
import { computeGroupChallengeSummary } from "@/lib/reportsGroupChallenges.server";

type PushSub = { endpoint: string; p256dh: string; auth: string };

/**
 * Run the weekly AI analysis for a single user (server-side, admin client).
 * Inserts an ai_reports row and returns the report id.
 */
export type WeeklyRunResult = { reportId: string | null; highlight: string };
export type WeeklyPushPayload = { highlight: string; trendingRecipe: string | null };

export async function runWeeklyReportForUser(userId: string, days = 7): Promise<WeeklyRunResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [profileRes, meals, water, workouts, sleep, fasting] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, daily_calorie_target, health_conditions, allergies").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("meal_logs").select("calories, protein_g, carbs_g, fat_g").eq("user_id", userId).gte("logged_at", since),
    supabaseAdmin.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", since),
    supabaseAdmin.from("workout_sessions").select("duration_min, calories_burned").eq("user_id", userId).gte("performed_at", since),
    supabaseAdmin.from("sleep_logs").select("sleep_start, sleep_end").eq("user_id", userId).gte("sleep_end", since),
    supabaseAdmin.from("fasting_sessions").select("completed").eq("user_id", userId).gte("start_time", since),
  ]);

  const groupChallenges = await computeGroupChallengeSummary(userId);

  const totalCals = (meals.data ?? []).reduce((s, m) => s + Number(m.calories || 0), 0);
  const totalWater = (water.data ?? []).reduce((s, w) => s + (w.amount_ml || 0), 0);
  const totalBurn = (workouts.data ?? []).reduce((s, w) => s + (w.calories_burned || 0), 0);
  const sleepHours = (sleep.data ?? []).reduce(
    (s, x) => s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000,
    0,
  );
  const fastingDone = (fasting.data ?? []).filter((f) => f.completed).length;

  const summary = {
    days,
    avg_calories_per_day: Math.round(totalCals / days),
    avg_water_ml: Math.round(totalWater / days),
    avg_burn_kcal: Math.round(totalBurn / days),
    avg_sleep_hours: +(sleepHours / days).toFixed(1),
    workout_sessions: workouts.data?.length ?? 0,
    fasting_completed: fastingDone,
    target_calories: profileRes.data?.daily_calorie_target ?? null,
    health_conditions: profileRes.data?.health_conditions ?? [],
    group_challenges: groupChallenges,
  };

  // Build a 1-line highlight for the push body
  const highlightParts: string[] = [];
  if (summary.avg_sleep_hours > 0) highlightParts.push(`Tidur ${summary.avg_sleep_hours}j`);
  if (summary.workout_sessions > 0) highlightParts.push(`${summary.workout_sessions}x olahraga`);
  const topGroup = groupChallenges.find((g) => g.rank > 0);
  if (topGroup) highlightParts.push(`rank #${topGroup.rank} di ${topGroup.group}`);
  const highlight = highlightParts.slice(0, 3).join(" · ") || "Lihat insight lengkap minggu ini";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Kamu adalah Dr. HealthyU, AI health coach. Buat laporan analisis mingguan singkat dalam Bahasa Indonesia (markdown, max 350 kata) dengan section: Ringkasan, Yang Berjalan Baik, Area Perbaikan, Progress Challenge Grup (skip jika kosong), Rekomendasi.`,
        },
        { role: "user", content: `Data ${days} hari terakhir:\n${JSON.stringify(summary, null, 2)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  const json = await res.json();
  const report: string = json?.choices?.[0]?.message?.content ?? "Tidak ada analisis.";

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const { data: saved } = await supabaseAdmin
    .from("ai_reports")
    .insert({
      user_id: userId,
      report_type: "weekly",
      report_period_start: start.toISOString().slice(0, 10),
      report_period_end: end.toISOString().slice(0, 10),
      summary: summary as never,
      recommendations: [report] as never,
      ai_model: "google/gemini-2.5-flash",
    })
    .select("id")
    .maybeSingle();

  return { reportId: saved?.id ?? null, highlight };
}

export async function getTopTrendingRecipe(): Promise<{ title: string } | null> {
  const { data } = await supabaseAdmin
    .from("recipes")
    .select("title, save_count, save_count_snapshot")
    .limit(200);
  if (!data || data.length === 0) return null;
  const ranked = data
    .map((r) => ({
      title: r.title as string,
      growth: Math.max(0, (r.save_count ?? 0) - (r.save_count_snapshot ?? 0)),
    }))
    .filter((r) => r.growth > 0)
    .sort((a, b) => b.growth - a.growth);
  return ranked[0] ?? null;
}

export async function sendWeeklyReportPush(
  userId: string,
  highlight?: string,
  trendingRecipe?: string | null,
) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  const body = [
    highlight ?? "Buka untuk lihat insight AI minggu ini",
    trendingRecipe ? `🔥 Trending: ${trendingRecipe}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
  const url = trendingRecipe ? "/recipes?sort=trending" : "/reports?focus=latest";
  for (const s of subs ?? []) {
    try {
      await sendWebPushTo(s as PushSub, {
        title: "Laporan mingguanmu siap 📊",
        body,
        url,
        tag: "weekly-report",
      });
    } catch (e) {
      console.error("weekly push fail", (e as Error).message);
    }
  }
}