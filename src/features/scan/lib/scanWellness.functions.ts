import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";

const callAI = makeScanAiCaller("scanBatch7");

// ===== from scanBatch8b2 (logMeditation, listMeditations, shouldSuggestFreeze) =====

export const shouldSuggestFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current, health_coins, streak_freeze_used_at")
      .eq("id", userId)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const noScanToday = p?.last_scan_date !== today;
    const canAfford = (p?.health_coins ?? 0) >= 30;
    const notUsedToday = p?.streak_freeze_used_at !== today;
    const goodStreak = (p?.scan_streak_current ?? 0) >= 3;
    const suggest = noScanToday && canAfford && notUsedToday && goodStreak && hour >= 20;
    return { suggest, streak: p?.scan_streak_current ?? 0 };
  });

export const logMeditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { durationMin: number; type?: string }) =>
    z
      .object({
        durationMin: z.number().int().min(1).max(120),
        type: z.string().max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase.from("meditation_sessions").insert({
      user_id: userId,
      duration_min: data.durationMin,
      type: data.type ?? "breathing",
    });
    return { ok: true };
  });

export const listMeditations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("meditation_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(20);
    return { sessions: data ?? [] };
  });

// ===== from scanBatch9b (createHydrationChallenge, joinHydrationChallenge, upsertSmartAlarm, listSmartAlarms) =====

export const createHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        groupId: z.string().uuid(),
        targetMl: z.number().int().min(500).max(20000),
        startDate: z.string(),
        endDate: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("hydration_challenges")
      .insert({
        group_id: data.groupId,
        creator_id: userId,
        target_ml: data.targetMl,
        start_date: data.startDate,
        end_date: data.endDate,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("hydration_challenge_members")
      .insert({ challenge_id: row.id, user_id: userId });
    return { challenge: row };
  });

export const joinHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hydration_challenge_members")
      .insert({ challenge_id: data.challengeId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertSmartAlarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
        windowMin: z.number().int().min(5).max(60).default(30),
        enabled: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      wake_time: data.wakeTime,
      window_min: data.windowMin,
      enabled: data.enabled,
    };
    const q = data.id
      ? supabase.from("smart_alarms").update(payload).eq("id", data.id).eq("user_id", userId)
      : supabase.from("smart_alarms").insert(payload);
    const { data: row, error } = await q.select().single();
    if (error) throw new Error(error.message);
    return { alarm: row };
  });

export const listSmartAlarms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("smart_alarms")
      .select("*")
      .eq("user_id", context.userId)
      .order("wake_time");
    if (error) throw new Error(error.message);
    return { alarms: data ?? [] };
  });

// ===== from scanBatch8b1 (adjustPortion) =====

export const adjustPortion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { baseCalories: number; multiplier: number }) =>
    z
      .object({ baseCalories: z.number().positive(), multiplier: z.number().min(0.1).max(5) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return { adjustedCalories: Math.round(data.baseCalories * data.multiplier) };
  });

// ===== from scanBatch9a (setWeightGoal, getWeightGoal, listExercises) =====

export const setWeightGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        startWeightKg: z.number().positive(),
        targetWeightKg: z.number().positive(),
        targetDate: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("weight_goals")
      .upsert(
        {
          user_id: userId,
          start_weight_kg: data.startWeightKg,
          target_weight_kg: data.targetWeightKg,
          target_date: data.targetDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { goal: row };
  });

export const getWeightGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("weight_goals")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return { goal: null, prediction: null };
    const { data: logs } = await context.supabase
      .from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", context.userId)
      .order("logged_at", { ascending: false })
      .limit(14);
    let prediction: { estDate: string | null; weeklyRate: number } | null = null;
    if (logs && logs.length >= 2) {
      const first = logs[logs.length - 1];
      const last = logs[0];
      const days = Math.max(
        1,
        (new Date(last.logged_at).getTime() - new Date(first.logged_at).getTime()) / 86400000,
      );
      const ratePerDay = (Number(last.weight_kg) - Number(first.weight_kg)) / days;
      const weeklyRate = ratePerDay * 7;
      const remaining = Number(data.target_weight_kg) - Number(last.weight_kg);
      const estDays = ratePerDay !== 0 ? Math.round(remaining / ratePerDay) : null;
      prediction = {
        estDate:
          estDays && estDays > 0
            ? new Date(Date.now() + estDays * 86400000).toISOString().slice(0, 10)
            : null,
        weeklyRate: Number(weeklyRate.toFixed(2)),
      };
    }
    return { goal: data, prediction };
  });

export const listExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ category: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("exercise_library").select("*").order("name");
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { exercises: rows ?? [] };
  });

// ===== from scanBatch11 (upsertSleepDiary, listSleepDiary, logWorkoutTimer) =====

export const upsertSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        diaryDate: z.string(),
        bedtime: z.string().optional(),
        wakeTime: z.string().optional(),
        quality: z.number().int().min(1).max(5).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sleep_diary")
      .upsert(
        {
          user_id: context.userId,
          diary_date: data.diaryDate,
          bedtime: data.bedtime ?? null,
          wake_time: data.wakeTime ?? null,
          quality: data.quality ?? null,
          notes: data.notes ?? null,
        },
        { onConflict: "user_id,diary_date" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { entry: row };
  });

export const listSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sleep_diary")
      .select("*")
      .eq("user_id", context.userId)
      .order("diary_date", { ascending: false })
      .limit(30);
    return { entries: data ?? [] };
  });

export const logWorkoutTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        exerciseName: z.string().min(1).max(100),
        totalSeconds: z.number().int().min(1),
        rounds: z.number().int().min(1).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workout_timer_sessions")
      .insert({
        user_id: context.userId,
        exercise_name: data.exerciseName,
        total_seconds: data.totalSeconds,
        rounds: data.rounds,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { session: row };
  });

// ===== from scanBatch7a (estimateBodyComposition, syncWorkoutBurn) =====

export const estimateBodyComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photoUrl: string }) => z.object({ photoUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const text = await callAI(
      `Analisis foto progress ini: ${data.photoUrl}. Estimasi: body fat %, muscle mass tier (low/med/high), posture. JSON only.`,
      "Kamu fitness analyst.",
      context.userId,
      context.supabase,
    );
    return { analysis: text };
  });

export const syncWorkoutBurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("workout_sessions")
      .select("calories_burned, started_at")
      .eq("user_id", userId)
      .gte("started_at", today);
    const total = (data ?? []).reduce<number>((s, w) => s + (w.calories_burned ?? 0), 0);
    return { totalBurned: total, sessions: data?.length ?? 0 };
  });

// ===== from scanSocialB (getWorkoutMatch) =====

export const getWorkoutMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("calories")
      .eq("user_id", userId)
      .gte("log_date", today);
    const totalKcal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
    return {
      totalKcal,
      suggestions: [
        { type: "Jalan kaki", minutes: Math.round(totalKcal / 5) },
        { type: "Jogging", minutes: Math.round(totalKcal / 7) },
        { type: "HIIT", minutes: Math.round(totalKcal / 10) },
      ],
    };
  });

// ===== from scanBatch10 (recommendExercises) =====

export const recommendExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ goal: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const text = await callAiWithGuards({
      userId,
      feature: "exercises.recommend",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Kamu coach fitness Indonesia. Jawab JSON array {name, sets, reps, rationale}.",
        },
        {
          role: "user",
          content: `Goal user: ${data.goal}. Berikan 5 latihan praktis di rumah, format JSON.`,
        },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    let plan: Record<string, string | number>[] = [];
    try {
      plan = JSON.parse(m ? m[0] : "[]");
    } catch {
      plan = [];
    }
    return { plan };
  });
