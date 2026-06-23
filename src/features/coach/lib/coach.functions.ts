import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any; // new tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any; // helper for reducer params

// ─── Action Plan schema ──────────────────────────────────────────────────────

const ActionItemSchema = z.object({
  action: z.enum([
    "log_water",
    "log_meal",
    "start_fast",
    "log_mood",
    "log_sleep",
    "log_workout",
    "review_meals",
  ]),
  label: z.string(),
  target_value: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const CoachSchema = z.object({
  greeting: z.string().default("Selamat pagi!"),
  focus: z.string().default("Jaga konsistensi hari ini."),
  summary: z.string().default(""),
  tips: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  action_plan: z.array(ActionItemSchema).default([]),
  mood: z.enum(["energetic", "focused", "tired", "stressed", "neutral"]).default("neutral"),
});

const EveningCoachSchema = z.object({
  greeting: z.string().default("Selamat malam!"),
  reflection: z.string().default(""),
  wins: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  tomorrow_focus: z.string().default(""),
  tips: z.array(z.string()).default([]),
  action_plan: z.array(ActionItemSchema).default([]),
});

export type CoachOutput = {
  id?: string | null;
  greeting: string;
  focus: string;
  summary: string;
  tips: string[];
  warnings: string[];
  action_plan: z.infer<typeof ActionItemSchema>[];
  mood: "energetic" | "focused" | "tired" | "stressed" | "neutral";
  generated_at: string;
  cached?: boolean;
};

export type EveningCoachOutput = {
  id?: string | null;
  greeting: string;
  reflection: string;
  wins: string[];
  improvements: string[];
  tomorrow_focus: string;
  tips: string[];
  action_plan: z.infer<typeof ActionItemSchema>[];
  generated_at: string;
  cached?: boolean;
};

// ─── Helper: get today's context (7-day data + today snapshot) ──────────────

async function gatherCoachContext(supabase: AnyClient, userId: string) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [profileRes, meals, water, workouts, sleep, fasting, vitals, weight, mood, lastCoach] =
    await Promise.all([
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
      supabase
        .from("mood_logs")
        .select("logged_at, mood, energy, note")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(3),
      // Last coach session (for continuity)
      supabase
        .from("coach_sessions")
        .select("kind, focus, generated_at, session_date")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("session_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const totalCals = (meals.data ?? []).reduce(
    (s: number, m: AnyRow) => s + Number(m.calories || 0),
    0,
  );
  const totalProtein = (meals.data ?? []).reduce(
    (s: number, m: AnyRow) => s + Number(m.protein_g || 0),
    0,
  );
  const totalWater = (water.data ?? []).reduce((s: number, w: AnyRow) => s + (w.amount_ml || 0), 0);
  const totalBurn = (workouts.data ?? []).reduce(
    (s: number, w: AnyRow) => s + (w.calories_burned || 0),
    0,
  );
  const sleepHours = (sleep.data ?? []).reduce(
    (s: number, x: AnyRow) =>
      s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000,
    0,
  );
  const fastingDone = (fasting.data ?? []).filter((f: AnyRow) => f.completed).length;
  const weightTrend = weight.data ?? [];
  const weightDelta =
    weightTrend.length >= 2
      ? Number(weightTrend[weightTrend.length - 1].weight_kg) - Number(weightTrend[0].weight_kg)
      : 0;

  // Today snapshot
  const todayMeals = (meals.data ?? []).filter((m: AnyRow) => new Date(m.logged_at) >= todayStart);
  const todayWater = (water.data ?? []).filter((w: AnyRow) => new Date(w.logged_at) >= todayStart);
  const todayCals = todayMeals.reduce((s: number, m: AnyRow) => s + Number(m.calories || 0), 0);
  const todayWaterMl = todayWater.reduce((s: number, w: AnyRow) => s + (w.amount_ml || 0), 0);

  return {
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
    today: {
      calories: Math.round(todayCals),
      meals_count: todayMeals.length,
      water_ml: todayWaterMl,
    },
    mood_recent: mood.data ?? [],
    last_coach: lastCoach.data ?? null,
  };
}

// ─── Morning Coach (enhanced) ───────────────────────────────────────────────

const MORNING_SYS = `Kamu adalah AI Coach kesehatan berbahasa Indonesia yang hangat, suportif, dan berbasis bukti. Berikan rekomendasi pagi yang singkat, actionable, dan personal berdasarkan data 7 hari + snapshot hari ini. Beri sapaan dengan nama depan user. JANGAN memberi diagnosis medis. Selalu jawab dalam format JSON valid sesuai schema.

Tone: hangat, suportif, tidak menghakimi. Kalau ada masalah, framing sebagai "kita bisa perbaiki" bukan "kamu gagal".

Action plan harus konkret: pilih dari action yang tersedia saja. Beri max 3 actions, diurutkan prioritas.`;

export const dailyCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => z.object({}).strict().parse({}))
  .handler(async ({ context }): Promise<CoachOutput> => {
    const { supabase, userId } = context;
    const startedAt = Date.now();

    // Check for today's session (avoid duplicate AI call)
    const { data: existing } = await (supabase as AnyClient)
      .from("coach_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", "morning")
      .eq("session_date", new Date().toISOString().slice(0, 10))
      .eq("archived", false)
      .maybeSingle();

    if (existing) {
      // Mark as read
      await (supabase as AnyClient)
        .from("coach_sessions")
        .update({ read_at: new Date().toISOString() })
        .eq("id", existing.id);
      return {
        id: existing.id,
        greeting: existing.greeting ?? "",
        focus: existing.focus ?? "",
        summary: existing.summary ?? "",
        tips: existing.tips ?? [],
        warnings: existing.warnings ?? [],
        action_plan: existing.action_plan ?? [],
        mood: existing.context_snapshot?.mood ?? "neutral",
        generated_at: existing.generated_at,
        cached: true,
      };
    }

    const ctx = await gatherCoachContext(supabase, userId);

    const userPrompt = `Data pengguna (7 hari terakhir + snapshot hari ini):
${JSON.stringify(ctx, null, 2)}

Buat coaching pagi dengan JSON:
{
  "greeting": "Sapaan pagi singkat dengan nama depan (1 kalimat)",
  "focus": "Satu fokus utama hari ini (1 kalimat, actionable)",
  "summary": "Ringkasan minggu lalu (2-3 kalimat, hangat, inklusif)",
  "tips": ["3-5 tips actionable, masing-masing 1 kalimat"],
  "warnings": ["0-2 peringatan halus jika ada pola tidak sehat, kosongkan jika tidak ada"],
  "action_plan": [{"action": "log_water|log_meal|start_fast|log_mood|log_sleep|log_workout|review_meals", "label": "Label singkat (max 4 kata)", "target_value": "opsional, misal '500ml' atau '30 menit'", "priority": "high|medium|low"}],
  "mood": "energetic|focused|tired|stressed|neutral (prediksi mood user berdasarkan data)"
}`;

    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "coach.daily",
      model: "google/gemini-2.5-flash",
      schema: CoachSchema,
      fallback: {
        greeting: "Selamat pagi!",
        focus: "Jaga konsistensi hari ini.",
        summary: "",
        tips: [],
        warnings: [],
        action_plan: [],
        mood: "neutral" as const,
      },
      messages: [
        { role: "system", content: MORNING_SYS },
        { role: "user", content: userPrompt },
      ],
    });

    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 0);

    // Persist to DB
    const { data: saved } = await (supabase as AnyClient)
      .from("coach_sessions")
      .insert({
        user_id: userId,
        kind: "morning",
        session_date: new Date().toISOString().slice(0, 10),
        greeting: parsed.greeting,
        focus: parsed.focus,
        summary: parsed.summary,
        tips: parsed.tips,
        warnings: parsed.warnings,
        action_plan: parsed.action_plan,
        context_snapshot: {
          mood: parsed.mood,
          week_avg_calories: ctx.seven_days.avg_calories_per_day,
          today_calories: ctx.today.calories,
          today_water_ml: ctx.today.water_ml,
        },
        model_version: "gemini-2.5-flash",
        generated_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      } as never)
      .select("id")
      .maybeSingle();

    return {
      id: saved?.id ?? null,
      ...parsed,
      generated_at: new Date().toISOString(),
      cached: false,
    };
  });

// ─── Evening Coach ──────────────────────────────────────────────────────────

const EVENING_SYS = `Kamu adalah AI Coach kesehatan untuk refleksi malam. Tugasmu:
- Apresiasi 1-3 WIN (hal positif yang user capai hari ini)
- Identifikasi 1-2 area improvement (jujur tapi suportif, tanpa menyalahkan)
- Beri FOKUS untuk BESOK yang konkret dan actionable
- Tips malam: hidrasi, sleep hygiene, persiapan besok

JANGAN memberi diagnosis medis. Tone hangat, suportif, no judgment. Pakai nama depan user.

Action plan untuk BESOK pagi: pilih dari action yang tersedia. Max 3 actions, urutkan prioritas.`;

export const eveningCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => z.object({}).strict().parse({}))
  .handler(async ({ context }): Promise<EveningCoachOutput> => {
    const { supabase, userId } = context;

    // Check existing
    const { data: existing } = await (supabase as AnyClient)
      .from("coach_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", "evening")
      .eq("session_date", new Date().toISOString().slice(0, 10))
      .eq("archived", false)
      .maybeSingle();

    if (existing) {
      await (supabase as AnyClient)
        .from("coach_sessions")
        .update({ read_at: new Date().toISOString() })
        .eq("id", existing.id);
      return {
        id: existing.id,
        greeting: existing.greeting ?? "",
        reflection: existing.summary ?? "", // reflection stored in summary
        wins: (existing.tips ?? []).slice(0, 3),
        improvements: existing.warnings ?? [],
        tomorrow_focus: existing.focus ?? "",
        tips: [],
        action_plan: existing.action_plan ?? [],
        generated_at: existing.generated_at,
        cached: true,
      };
    }

    const ctx = await gatherCoachContext(supabase, userId);
    const h = new Date().getHours();

    const userPrompt = `Data pengguna (7 hari + snapshot hari ini):
${JSON.stringify(ctx, null, 2)}

Waktu: ${h}:${String(new Date().getMinutes()).padStart(2, "0")} (malam)

Buat refleksi malam dengan JSON:
{
  "greeting": "Sapaan malam singkat dengan nama depan (1 kalimat)",
  "reflection": "Refleksi singkat hari ini (1-2 kalimat, hangat, inklusif)",
  "wins": ["1-3 hal positif yang user capai hari ini, spesifik kalau ada data"],
  "improvements": ["0-2 area improvement untuk BESOK, jujur tapi suportif"],
  "tomorrow_focus": "Fokus utama untuk besok pagi (1 kalimat, actionable)",
  "tips": ["1-3 tips praktis untuk malam ini: sleep, hidrasi, dll"],
  "action_plan": [{"action": "log_water|log_meal|start_fast|log_mood|log_sleep|log_workout|review_meals", "label": "Label singkat (max 4 kata)", "target_value": "opsional", "priority": "high|medium|low"}]
}`;

    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "coach.evening",
      model: "google/gemini-2.5-flash",
      schema: EveningCoachSchema,
      fallback: {
        greeting: "Selamat malam!",
        reflection: "",
        wins: [],
        improvements: [],
        tomorrow_focus: "",
        tips: [],
        action_plan: [],
      },
      messages: [
        { role: "system", content: EVENING_SYS },
        { role: "user", content: userPrompt },
      ],
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    expiresAt.setHours(11, 59, 59, 0);

    const { data: saved } = await (supabase as AnyClient)
      .from("coach_sessions")
      .insert({
        user_id: userId,
        kind: "evening",
        session_date: new Date().toISOString().slice(0, 10),
        greeting: parsed.greeting,
        focus: parsed.tomorrow_focus,
        summary: parsed.reflection, // store reflection in summary
        tips: parsed.wins, // store wins in tips
        warnings: parsed.improvements, // store improvements in warnings
        action_plan: parsed.action_plan,
        context_snapshot: {
          week_avg_calories: ctx.seven_days.avg_calories_per_day,
          today_calories: ctx.today.calories,
          today_water_ml: ctx.today.water_ml,
        },
        model_version: "gemini-2.5-flash",
        generated_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      } as never)
      .select("id")
      .maybeSingle();

    return {
      id: saved?.id ?? null,
      ...parsed,
      generated_at: new Date().toISOString(),
      cached: false,
    };
  });

// ─── Coach History (last 7 days) ────────────────────────────────────────────

export const getCoachHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as AnyClient)
      .from("coach_sessions")
      .select("id, kind, session_date, focus, summary, tips, warnings, generated_at, read_at")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("session_date", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─── Mark coach as read ─────────────────────────────────────────────────────

export const markCoachRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await (supabase as AnyClient)
      .from("coach_sessions")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });
