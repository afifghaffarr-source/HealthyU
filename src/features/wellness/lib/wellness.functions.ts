import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Monday of the week (UTC date string YYYY-MM-DD) for a given date. */
function isoWeekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = x.getUTCDay() || 7; // Sun=0 → 7
  if (dow !== 1) x.setUTCDate(x.getUTCDate() - (dow - 1));
  return x.toISOString().slice(0, 10);
}

// ---------- WEEKLY GOAL ----------

export const getCurrentWeeklyGoal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const week_start = isoWeekStart();
    const { data, error } = await supabase
      .from("weekly_goals")
      .select("id, goal_text, completed_at, week_start")
      .eq("user_id", userId)
      .eq("week_start", week_start)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { weekStart: week_start, goal: data };
  });

export const setWeeklyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ goal_text: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const week_start = isoWeekStart();
    const { error } = await supabase
      .from("weekly_goals")
      .upsert(
        { user_id: userId, week_start, goal_text: data.goal_text, completed_at: null },
        { onConflict: "user_id,week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleWeeklyGoalDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("weekly_goals")
      .update({ completed_at: data.done ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- STREAK FREEZES ----------

export const getStreakFreezes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("streak_freezes")
      .select("id, earned_at, used_at, used_for_date, source")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const available = (data ?? []).filter((f) => f.used_at === null).length;
    return { available, history: data ?? [] };
  });

/** Award 1 freeze if user logged mood ≥5 of last 7 days and has <2 unused freezes. */
export const claimWeeklyFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Existing unused count (cap 2)
    const { data: unused, error: ue } = await supabase
      .from("streak_freezes")
      .select("id")
      .eq("user_id", userId)
      .is("used_at", null);
    if (ue) throw new Error(ue.message);
    if ((unused?.length ?? 0) >= 2) return { ok: false, reason: "max_reached" as const };

    // Already claimed this week?
    const weekStart = isoWeekStart();
    const { data: thisWeek, error: we } = await supabase
      .from("streak_freezes")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "weekly_bonus")
      .gte("earned_at", `${weekStart}T00:00:00Z`);
    if (we) throw new Error(we.message);
    if ((thisWeek?.length ?? 0) > 0) return { ok: false, reason: "already_claimed" as const };

    // Check mood consistency (≥5 distinct days in last 7)
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data: moods, error: me } = await supabase
      .from("mood_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString());
    if (me) throw new Error(me.message);
    const days = new Set(
      (moods ?? []).map((m) => new Date(m.logged_at as string).toISOString().slice(0, 10)),
    );
    if (days.size < 5) return { ok: false, reason: "not_eligible" as const, progress: days.size };

    const { error: ie } = await supabase
      .from("streak_freezes")
      .insert({ user_id: userId, source: "weekly_bonus" });
    if (ie) throw new Error(ie.message);
    return { ok: true as const };
  });

// ---------- MOOD 7-DAY TREND ----------

export const getMood7Day = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("mood_logs")
      .select("mood, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Bucket per day → average mood
    const byDay = new Map<string, { sum: number; n: number }>();
    for (const r of data ?? []) {
      const key = new Date(r.logged_at as string).toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { sum: 0, n: 0 };
      cur.sum += Number(r.mood);
      cur.n += 1;
      byDay.set(key, cur);
    }
    const days: Array<{ date: string; avg: number | null }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const b = byDay.get(key);
      days.push({ date: key, avg: b ? Math.round((b.sum / b.n) * 10) / 10 : null });
    }
    const valid = days.filter((d) => d.avg !== null) as Array<{ date: string; avg: number }>;
    const overall =
      valid.length > 0
        ? Math.round((valid.reduce((a, d) => a + d.avg, 0) / valid.length) * 10) / 10
        : null;
    return { days, overall, daysLogged: valid.length };
  });
