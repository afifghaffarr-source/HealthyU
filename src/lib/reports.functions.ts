import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const weeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().min(1).max(90).default(7) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const [meals, water, workouts, sleep, fasting] = await Promise.all([
      supabase.from("meal_logs").select("logged_at, calories, protein_g, carbs_g, fat_g, meal_type").eq("user_id", userId).gte("logged_at", since),
      supabase.from("water_logs").select("logged_at, amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase.from("workout_sessions").select("performed_at, name, duration_min, calories_burned, type").eq("user_id", userId).gte("performed_at", since),
      supabase.from("sleep_logs").select("sleep_start, sleep_end, quality").eq("user_id", userId).gte("sleep_end", since),
      supabase.from("fasting_sessions").select("start_time, end_time, target_hours, completed, protocol").eq("user_id", userId).gte("start_time", since),
    ]);

    return {
      meals: meals.data ?? [],
      water: water.data ?? [],
      workouts: workouts.data ?? [],
      sleep: sleep.data ?? [],
      fasting: fasting.data ?? [],
    };
  });

export const weeklyAiAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().min(1).max(30).default(7) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI tidak tersedia");
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const [profileRes, meals, water, workouts, sleep, fasting] = await Promise.all([
      supabase.from("profiles").select("full_name, dob, sex, height_cm, weight_kg, activity_level, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g, water_target_ml, health_conditions, allergies").eq("id", userId).maybeSingle(),
      supabase.from("meal_logs").select("logged_at, calories, protein_g, carbs_g, fat_g, meal_type").eq("user_id", userId).gte("logged_at", since),
      supabase.from("water_logs").select("logged_at, amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase.from("workout_sessions").select("performed_at, duration_min, calories_burned, type").eq("user_id", userId).gte("performed_at", since),
      supabase.from("sleep_logs").select("sleep_start, sleep_end, quality").eq("user_id", userId).gte("sleep_end", since),
      supabase.from("fasting_sessions").select("start_time, end_time, target_hours, completed, protocol").eq("user_id", userId).gte("start_time", since),
    ]);

    const totalCals = (meals.data ?? []).reduce((s, m) => s + Number(m.calories || 0), 0);
    const totalProtein = (meals.data ?? []).reduce((s, m) => s + Number(m.protein_g || 0), 0);
    const totalCarbs = (meals.data ?? []).reduce((s, m) => s + Number(m.carbs_g || 0), 0);
    const totalFat = (meals.data ?? []).reduce((s, m) => s + Number(m.fat_g || 0), 0);
    const totalWater = (water.data ?? []).reduce((s, w) => s + (w.amount_ml || 0), 0);
    const totalBurn = (workouts.data ?? []).reduce((s, w) => s + (w.calories_burned || 0), 0);
    const sleepHours = (sleep.data ?? []).reduce((s, x) => s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000, 0);
    const fastingDone = (fasting.data ?? []).filter((f) => f.completed).length;
    const d = data.days;

    const profile = profileRes.data;
    const summary = {
      days: d,
      avg_calories_per_day: Math.round(totalCals / d),
      avg_protein_g: Math.round(totalProtein / d),
      avg_carbs_g: Math.round(totalCarbs / d),
      avg_fat_g: Math.round(totalFat / d),
      avg_water_ml: Math.round(totalWater / d),
      avg_burn_kcal: Math.round(totalBurn / d),
      avg_sleep_hours: +(sleepHours / d).toFixed(1),
      workout_sessions: workouts.data?.length ?? 0,
      fasting_completed: fastingDone,
      targets: profile ? {
        calories: profile.daily_calorie_target,
        protein_g: profile.protein_target_g,
        carbs_g: profile.carbs_target_g,
        fat_g: profile.fat_target_g,
        water_ml: profile.water_target_ml,
      } : null,
      health_conditions: profile?.health_conditions ?? [],
      allergies: profile?.allergies ?? [],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Kamu adalah Dr. HealthyU, AI health coach. Buat laporan analisis mingguan dalam Bahasa Indonesia berdasarkan data user. Format markdown ringkas dengan section:\n## 📊 Ringkasan\n## ✅ Yang Berjalan Baik\n## ⚠️ Area Perlu Perbaikan\n## 🔗 Korelasi & Insight\n(hubungkan tidur dengan kalori/olahraga, puasa dengan pola makan, hidrasi dengan aktivitas)\n## 🎯 Rekomendasi Minggu Depan\n(3-5 action items konkret)\n\nJangan diagnosis medis. Selalu beri disclaimer jika ada metrik di luar normal.`,
          },
          { role: "user", content: `Data ${d} hari terakhir:\n${JSON.stringify(summary, null, 2)}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi.");
    if (res.status === 402) throw new Error("Kredit AI habis.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = await res.json();
    const report: string = json?.choices?.[0]?.message?.content ?? "Tidak ada analisis.";
    return { report, summary };
  });