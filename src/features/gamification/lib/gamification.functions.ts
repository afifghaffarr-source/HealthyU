import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { todayRange } from "@/lib/health";

export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
export const xpForLevel = (level: number) => Math.pow(level - 1, 2) * 100;

const ActivitySchema = z.object({
  type: z.enum(["meal_logged", "water_logged", "fast_completed"]),
});

type StatsRow = {
  user_id: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

export const getGameSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [statsRes, achRes, mineRes] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("achievements").select("*").order("xp_reward", { ascending: true }),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId),
    ]);
    const stats: StatsRow = statsRes.data ?? {
      user_id: userId,
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
    };
    return {
      stats,
      achievements: achRes.data ?? [],
      unlocked: mineRes.data ?? [],
    };
  });

type ActivityType = z.infer<typeof ActivitySchema>["type"];

// Internal helper callable from other server fns.
export async function recordActivityFor(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: ActivityType,
) {
  const today = isoDate(new Date());

  // 1) Streak + base XP for activity
  const { data: existing } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const baseXp = type === "fast_completed" ? 50 : type === "meal_logged" ? 15 : 5;

  let current_streak = 1;
  let longest_streak = 1;
  let xp = baseXp;

  if (existing) {
    xp = (existing.xp ?? 0) + baseXp;
    const last = existing.last_activity_date as string | null;
    if (last === today) {
      current_streak = existing.current_streak ?? 1;
    } else if (last && daysBetween(last, today) === 1) {
      current_streak = (existing.current_streak ?? 0) + 1;
    } else {
      current_streak = 1;
    }
    longest_streak = Math.max(existing.longest_streak ?? 0, current_streak);
  }

  let level = levelFromXp(xp);

  await supabase.from("user_stats").upsert({
    user_id: userId,
    xp,
    level,
    current_streak,
    longest_streak,
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  });

  // 2) Evaluate achievements
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  const unlockedIds = new Set(
    (unlocked ?? []).map((u: { achievement_id: string }) => u.achievement_id),
  );
  const toUnlock: string[] = [];

  const tryUnlock = (id: string) => {
    if (!unlockedIds.has(id)) toUnlock.push(id);
  };

  if (type === "meal_logged") tryUnlock("first_meal");
  if (type === "fast_completed") tryUnlock("first_fast");

  if (type === "water_logged") {
    const { start, end } = todayRange();
    const { data: waterRows } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end);
    const total = (waterRows ?? []).reduce(
      (s: number, r: { amount_ml: number | null }) => s + (r.amount_ml ?? 0),
      0,
    );
    if (total >= 2000) tryUnlock("hydration_hero");
  }

  if (current_streak >= 3) tryUnlock("streak_3");
  if (current_streak >= 7) tryUnlock("streak_7");
  if (current_streak >= 30) tryUnlock("streak_30");
  if (level >= 5) tryUnlock("level_5");
  if (level >= 10) tryUnlock("level_10");

  let bonusXp = 0;
  const newlyUnlocked: { id: string; title: string; xp_reward: number; icon: string }[] = [];
  if (toUnlock.length) {
    const { data: catalog } = await supabase
      .from("achievements")
      .select("id, title, xp_reward, icon")
      .in("id", toUnlock);
    if (catalog) {
      for (const a of catalog) {
        newlyUnlocked.push(a);
        bonusXp += a.xp_reward ?? 0;
      }
      await supabase
        .from("user_achievements")
        .insert(catalog.map((a: { id: string }) => ({ user_id: userId, achievement_id: a.id })));
    }
  }

  if (bonusXp > 0) {
    xp += bonusXp;
    level = levelFromXp(xp);
    await supabase
      .from("user_stats")
      .update({ xp, level, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return { xp, level, current_streak, longest_streak, awarded: baseXp + bonusXp, newlyUnlocked };
}

export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivitySchema.parse(input))
  .handler(async ({ data, context }) => {
    return recordActivityFor(context.supabase, context.userId, data.type);
  });
