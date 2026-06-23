import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordActivityFor } from "@/features/gamification/lib/gamification.functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ─── Existing functions (unchanged, re-exported for convenience) ─────────────

export const currentFast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        protocol: z.string().max(30),
        target_hours: z.number().min(1).max(72),
        is_custom: z.boolean().optional().default(false),
        is_ramadhan: z.boolean().optional().default(false),
        eating_window_start: z.string().max(5).optional(),
        eating_window_end: z.string().max(5).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // close existing first
    await supabase
      .from("fasting_sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("user_id", userId)
      .is("end_time", null);
    const { error } = await supabase.from("fasting_sessions").insert({
      user_id: userId,
      protocol: data.protocol,
      target_hours: data.target_hours,
      is_custom: data.is_custom,
      is_ramadhan: data.is_ramadhan,
      eating_window_start: data.eating_window_start ?? null,
      eating_window_end: data.eating_window_end ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stopFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        mood_before: z.number().min(1).max(5).optional(),
        mood_after: z.number().min(1).max(5).optional(),
        hydration_count: z.number().min(0).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const end = new Date().toISOString();
    const { data: session } = await supabase
      .from("fasting_sessions")
      .select("start_time, target_hours")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    let completed = false;
    if (session) {
      const hrs = (Date.now() - new Date(session.start_time).getTime()) / 3600000;
      completed = hrs >= Number(session.target_hours) * 0.8; // 80% threshold counts as completed
    }
    const { error } = await supabase
      .from("fasting_sessions")
      .update({
        end_time: end,
        completed,
        mood_before: data.mood_before ?? null,
        mood_after: data.mood_after ?? null,
        hydration_count: data.hydration_count ?? 0,
      } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const game = completed ? await recordActivityFor(supabase, userId, "fast_completed") : null;
    return { ok: true, completed, game };
  });

export const fastHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_sessions")
      .select(
        "id, protocol, target_hours, start_time, end_time, completed, is_ramadhan, is_custom, mood_after",
      )
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .order("start_time", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─── New: Fasting Stats ──────────────────────────────────────────────────────

export const getFastingStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Get current streak via the SQL function (may not exist until migration applied)
    const { data: streakResult, error: rpcError } = await supabase.rpc("get_fasting_stats", {
      p_user_id: userId,
    });

    // If RPC fails or doesn't exist yet (migration not applied), compute manually
    if (!streakResult || rpcError) {
      return computeFallbackStats(userId, supabase);
    }

    return streakResult as {
      current_streak: number;
      total_fasts: number;
      total_hours: number;
      longest_fast: number;
      this_week_count: number;
    };
  });

/**
 * Fallback stats computation when get_fasting_stats RPC is not yet available.
 */
async function computeFallbackStats(userId: string, supabase: SupabaseClient<Database>) {
  // Get completed fasts
  const { data: fasts } = await supabase
    .from("fasting_sessions")
    .select("start_time, end_time, target_hours")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("end_time", "is", null)
    .order("start_time", { ascending: false });

  const completedFasts = (fasts ?? []).map(
    (f: { start_time: string; end_time: string | null; target_hours: number | string }) => ({
      date: new Date(f.start_time).toISOString().split("T")[0],
      hours: f.end_time
        ? (new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / 3600000
        : 0,
    }),
  );

  // Compute streak
  const streak = computeStreak(completedFasts);
  const totalHours = completedFasts.reduce((sum: number, f: { hours: number }) => sum + f.hours, 0);
  const longestFast = completedFasts.reduce(
    (max: number, f: { hours: number }) => Math.max(max, f.hours),
    0,
  );
  const thisWeekCount = completedFasts.filter(
    (f: { date: string }) => new Date(f.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;

  return {
    current_streak: streak,
    total_fasts: completedFasts.length,
    total_hours: Math.round(totalHours * 10) / 10,
    longest_fast: Math.round(longestFast * 10) / 10,
    this_week_count: thisWeekCount,
  };
}

/**
 * Compute consecutive day streak from completed fast dates.
 */
function computeStreak(fasts: Array<{ date: string; hours: number }>): number {
  if (fasts.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Find the most recent streak-ending date
  let streakEnd: string | null = null;
  if (fasts.some((f) => f.date === todayStr)) streakEnd = todayStr;
  else if (fasts.some((f) => f.date === yesterdayStr)) streakEnd = yesterdayStr;
  else return 0; // streak broken

  // Count consecutive days backwards from streakEnd
  let streak = 0;
  const uniqueDates = new Set(fasts.map((f) => f.date));
  const checkDate = new Date(streakEnd!);

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (uniqueDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── New: Save Schedule (enhanced) ──────────────────────────────────────────

const ScheduleSchema = z.object({
  fasting_type: z.string().min(1).max(30),
  is_ramadhan_mode: z.boolean().default(false),
  is_active: z.boolean().default(true),
  target_duration_hours: z.number().min(1).max(24).nullable().optional(),
  eating_window_start: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  eating_window_end: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  enabled_days: z.array(z.number().min(0).max(6)).max(7).default([]),
});

export const saveFastingSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScheduleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // deactivate existing
    await supabase.from("fasting_schedules").update({ is_active: false }).eq("user_id", userId);
    const { error } = await supabase.from("fasting_schedules").insert({
      user_id: userId,
      fasting_type: data.fasting_type,
      is_ramadhan_mode: data.is_ramadhan_mode,
      is_active: data.is_active,
      target_duration_hours: data.target_duration_hours ?? null,
      eating_window_start: data.eating_window_start ?? null,
      eating_window_end: data.eating_window_end ?? null,
      enabled_days: data.enabled_days as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFastingSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

// ─── New: Record hydration during fast ───────────────────────────────────────

export const recordHydration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ session_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("fasting_sessions")
      .select("hydration_count")
      .eq("id", data.session_id)
      .eq("user_id", userId)
      .is("end_time", null)
      .maybeSingle();

    if (!session) return { ok: false, reason: "no_active_fast" };

    const newCount = (session.hydration_count ?? 0) + 1;
    await supabase
      .from("fasting_sessions")
      .update({ hydration_count: newCount })
      .eq("id", data.session_id)
      .eq("user_id", userId);

    return { ok: true, count: newCount };
  });
