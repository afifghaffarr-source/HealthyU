import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Recipe reviews =====

export const addRecipeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        recipeId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        review: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("recipe_reviews")
      .upsert(
        {
          recipe_id: data.recipeId,
          user_id: userId,
          rating: data.rating,
          review: data.review ?? null,
        },
        { onConflict: "recipe_id,user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { review: row };
  });

export const listRecipeReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("recipe_reviews")
      .select("id, rating, review, created_at, user_id")
      .eq("recipe_id", data.recipeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [] };
  });

// ===== Charity donation (coins → charity) =====

export const donateCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        coins: z.number().int().min(10).max(10000),
        charityName: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .single();
    if (!prof || (prof.health_coins ?? 0) < data.coins) throw new Error("Coin tidak cukup");
    const { data: row, error } = await supabase
      .from("charity_donations")
      .insert({ user_id: userId, coins_spent: data.coins, charity_name: data.charityName })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("profiles")
      .update({ health_coins: (prof.health_coins ?? 0) - data.coins })
      .eq("id", userId);
    return { donation: row };
  });

// ===== Achievement showcase reorder =====

export const reorderShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order: z.array(z.string().uuid()).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("achievement_showcase_order").delete().eq("user_id", userId);
    if (data.order.length) {
      const rows = data.order.map((aid, i) => ({
        user_id: userId,
        achievement_id: aid,
        position: i,
      }));
      const { error } = await supabase.from("achievement_showcase_order").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== Weekly leaderboard =====

function getCurrentWeekStart(): string {
  const monday = new Date();
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

export const getWeeklyLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const week = getCurrentWeekStart();
    const { data } = await context.supabase
      .from("weekly_leaderboard")
      .select("user_id, score, rank")
      .eq("week_start", week)
      .order("score", { ascending: false })
      .limit(50);
    return { week, rows: data ?? [] };
  });

export const upsertWeeklyScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ score: z.number().int().min(0).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    const week = getCurrentWeekStart();
    const { error } = await context.supabase
      .from("weekly_leaderboard")
      .upsert(
        { user_id: context.userId, week_start: week, score: data.score },
        { onConflict: "user_id,week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Streak freeze (consume 30 coins) =====

export const useStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins, streak_freeze_used_at, last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if ((prof.health_coins ?? 0) < 30) throw new Error("Coin tidak cukup (butuh 30)");
    if (prof.streak_freeze_used_at === today) throw new Error("Sudah dipakai hari ini");
    await supabase
      .from("profiles")
      .update({
        health_coins: (prof.health_coins ?? 0) - 30,
        streak_freeze_used_at: today,
        last_scan_date: today,
      })
      .eq("id", userId);
    return { ok: true, streak: prof.scan_streak_current };
  });

// ===== Audit opt-in (user consent for usage analytics) =====

export const setAuditOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ scan_audit_opt_in: data.enabled })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
