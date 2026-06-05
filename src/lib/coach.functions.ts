import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAiJsonWithSchema } from "@/lib/aiGateway.server";

const CoachSchema = z
  .object({
    greeting: z.string().default("Selamat pagi!"),
    focus: z.string().default("Jaga konsistensi hari ini."),
    summary: z.string().default(""),
    tips: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
  })
  ;

type CoachOutput = {
  greeting: string;
  focus: string;
  summary: string;
  tips: string[];
  warnings: string[];
  generated_at: string;
};

export const dailyCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachOutput> => {
    const { supabase, userId } = context;

    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [profileRes, meals, water, workouts, sleep, fasting, vitals, weight] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, birth_date, gender, height_cm, weight_kg, target_weight_kg, activity_level, daily_calorie_target, health_conditions, allergies, dietary_preference",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("meal_logs")
        .select("logged_at, calories, protein_g, carbs_g, fat_g, meal_type")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase
        .from("water_logs")
        .select("logged_at, amount_ml")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase
        .from("workout_sessions")
        .select("performed_at, duration_min, calories_burned, type, intensity")
        .eq("user_id", userId)
        .gte("performed_at", since),
      supabase
        .from("sleep_logs")
        .select("sleep_start, sleep_end, quality")
        .eq("user_id", userId)
        .gte("sleep_end", since),
      supabase
        .from("fasting_sessions")
        .select("start_time, end_time, target_hours, completed")
        .eq("user_id", userId)
        .gte("start_time", since),
      supabase
        .from("vitals_logs")
        .select("logged_at, systolic, diastolic, heart_rate, glucose_mgdl")
        .eq("user_id", userId)
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(10),
      supabase
        .from("weight_logs")
        .select("logged_at, weight_kg")
        .eq("user_id", userId)
        .gte("logged_at", since)
        .order("logged_at", { ascending: true }),
    ]);

    const totalCals = (meals.data ?? []).reduce((s, m) => s + Number(m.calories || 0), 0);
    const totalProtein = (meals.data ?? []).reduce((s, m) => s + Number(m.protein_g || 0), 0);
    const totalWater = (water.data ?? []).reduce((s, w) => s + (w.amount_ml || 0), 0);
    const totalBurn = (workouts.data ?? []).reduce((s, w) => s + (w.calories_burned || 0), 0);
    const sleepHours = (sleep.data ?? []).reduce(
      (s, x) => s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000,
      0,
    );
    const fastingDone = (fasting.data ?? []).filter((f) => f.completed).length;
    const weightTrend = weight.data ?? [];
    const weightDelta =
      weightTrend.length >= 2
        ? Number(weightTrend[weightTrend.length - 1].weight_kg) - Number(weightTrend[0].weight_kg)
        : 0;

    const summary = {
      profile: profileRes.data,
      seven_days: {
        avg_calories_per_day: Math.round(totalCals / 7),
        avg_protein_per_day: Math.round(totalProtein / 7),
        avg_water_ml_per_day: Math.round(totalWater / 7),
        workouts_count: (workouts.data ?? []).length,
        calories_burned_total: totalBurn,
        avg_sleep_hours: Number((sleepHours / 7).toFixed(1)),
        fasting_completed: fastingDone,
        weight_delta_kg: Number(weightDelta.toFixed(2)),
        recent_vitals: vitals.data ?? [],
      },
    };

    const sysPrompt = `Kamu adalah AI Coach kesehatan berbahasa Indonesia yang ramah, suportif, dan berbasis bukti. Berikan rekomendasi pagi yang singkat, actionable, dan personal berdasarkan data 7 hari terakhir pengguna. Jangan memberi diagnosis medis. Selalu jawab dalam format JSON valid sesuai schema.`;

    const userPrompt = `Data pengguna 7 hari terakhir:\n${JSON.stringify(summary, null, 2)}\n\nBuat coaching pagi dengan struktur JSON:
{
  "greeting": "Sapaan pagi singkat dengan nama (1 kalimat)",
  "focus": "Satu fokus utama hari ini (1 kalimat singkat)",
  "summary": "Ringkasan minggu lalu (2-3 kalimat, hangat)",
  "tips": ["3-5 tips actionable hari ini, masing-masing 1 kalimat"],
  "warnings": ["0-2 peringatan halus jika ada pola tidak sehat, kosongkan jika tidak ada"]
}`;

    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "coach.daily",
      model: "google/gemini-3-flash-preview",
      schema: CoachSchema,
      fallback: {
        greeting: "Selamat pagi!",
        focus: "Jaga konsistensi hari ini.",
        summary: "",
        tips: [],
        warnings: [],
      },
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return { ...parsed, generated_at: new Date().toISOString() };
  });
