import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ============ 20: Follow / public profile ============
export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.targetId === userId) throw new Error("Tidak bisa follow diri sendiri");
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: userId, following_id: data.targetId });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", data.targetId);
    return { ok: true };
  });

// ============ 12: Meal stories (24h) ============
export const createMealStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caption?: string; imageUrl?: string; mealLogId?: string }) =>
    z
      .object({
        caption: z.string().max(280).optional(),
        imageUrl: z.string().url().optional(),
        mealLogId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: story, error } = await supabase
      .from("meal_stories")
      .insert({
        user_id: userId,
        caption: data.caption,
        image_url: data.imageUrl,
        meal_log_id: data.mealLogId,
      })
      .select()
      .single();
    if (error) throw error;
    return { story };
  });

export const listStoriesFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("meal_stories")
      .select(
        "id, user_id, caption, image_url, created_at, expires_at, profiles!inner(full_name, avatar_url)",
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    return { stories: data ?? [] };
  });

// ============ 17 + 18: workout match & sleep correlation ============
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
    // ~7 kcal/min jogging, 5 kcal/min walking, 10 kcal/min HIIT (avg 70kg)
    return {
      totalKcal,
      suggestions: [
        { type: "Jalan kaki", minutes: Math.round(totalKcal / 5) },
        { type: "Jogging", minutes: Math.round(totalKcal / 7) },
        { type: "HIIT", minutes: Math.round(totalKcal / 10) },
      ],
    };
  });

export const getSleepMealCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data: sleeps } = await supabase
      .from("sleep_logs")
      .select("log_date, duration_hours")
      .eq("user_id", userId)
      .gte("log_date", since);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("log_date, calories")
      .eq("user_id", userId)
      .gte("log_date", since);
    const mealByDate = new Map<string, number>();
    for (const m of meals ?? []) {
      if (!m.log_date) continue;
      mealByDate.set(m.log_date, (mealByDate.get(m.log_date) ?? 0) + Number(m.calories ?? 0));
    }
    const points = (sleeps ?? [])
      .filter((s) => s.log_date)
      .map((s) => ({
        date: s.log_date as string,
        sleepHours: Number(s.duration_hours ?? 0),
        calories: mealByDate.get(s.log_date as string) ?? 0,
      }));
    return { points };
  });
