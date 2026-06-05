import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ============ Pet evolution from scan streak ============
function computeStage(streak: number): string {
  if (streak >= 60) return "adult";
  if (streak >= 21) return "teen";
  if (streak >= 7) return "baby";
  return "egg";
}

export const evolvePet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    const stage = computeStage(prof?.scan_streak_current ?? 0);
    const { data: pet } = await supabase
      .from("virtual_pets")
      .select("id, pet_stage")
      .eq("user_id", userId)
      .maybeSingle();
    if (pet && pet.pet_stage !== stage) {
      await supabase.from("virtual_pets").update({ pet_stage: stage }).eq("id", pet.id);
    }
    return { stage, evolved: !!(pet && pet.pet_stage !== stage) };
  });

// ============ Story comments / likes ============
export const commentOnStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string; body: string }) =>
    z.object({ storyId: z.string().uuid(), body: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("story_comments")
      .insert({ story_id: data.storyId, user_id: userId, body: data.body });
    if (error) throw error;
    return { ok: true };
  });

export const listStoryComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string }) => z.object({ storyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("story_comments")
      .select("id, body, user_id, created_at, profiles!inner(full_name, avatar_url)")
      .eq("story_id", data.storyId)
      .order("created_at", { ascending: true });
    type Comment = {
      id: string;
      body: string;
      user_id: string;
      created_at: string;
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    };
    return { comments: (rows ?? []) as unknown as Comment[] };
  });

export const toggleStoryLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string }) => z.object({ storyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("story_likes")
      .select("user_id")
      .eq("story_id", data.storyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", data.storyId)
        .eq("user_id", userId);
      return { liked: false };
    }
    await supabase.from("story_likes").insert({ story_id: data.storyId, user_id: userId });
    return { liked: true };
  });

// ============ Public profile ============
export const getPublicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current, scan_streak_longest, public_profile")
      .eq("id", data.userId)
      .maybeSingle();
    if (!prof) throw new Error("Not found");
    if (!prof.public_profile && prof.id !== userId) throw new Error("Profil ini privat");
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at, achievements(title, icon)")
      .eq("user_id", data.userId)
      .order("unlocked_at", { ascending: false })
      .limit(12);
    const { count: followers } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", data.userId);
    const { count: following } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", data.userId);
    const { data: isFollowing } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", data.userId)
      .maybeSingle();
    return {
      profile: prof,
      achievements: achievements ?? [],
      followers: followers ?? 0,
      following: following ?? 0,
      isFollowing: !!isFollowing,
    };
  });

// ============ Mood × meal correlation ============
export const moodMealCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: moods } = await supabase
      .from("mood_logs")
      .select("log_date, mood")
      .eq("user_id", userId)
      .gte("log_date", since);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("log_date, calories, sugar_g")
      .eq("user_id", userId)
      .gte("log_date", since);
    const byDate = new Map<string, { kcal: number; sugar: number }>();
    for (const m of meals ?? []) {
      if (!m.log_date) continue;
      const cur = byDate.get(m.log_date) ?? { kcal: 0, sugar: 0 };
      cur.kcal += Number(m.calories ?? 0);
      cur.sugar += Number(m.sugar_g ?? 0);
      byDate.set(m.log_date, cur);
    }
    const points = (moods ?? [])
      .filter((m) => m.log_date)
      .map((m) => ({
        date: m.log_date as string,
        mood: m.mood,
        kcal: byDate.get(m.log_date as string)?.kcal ?? 0,
        sugar: byDate.get(m.log_date as string)?.sugar ?? 0,
      }));
    return { points };
  });

// ============ Hydration × meal pairing ============
export const hydrationMealPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: water } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("log_date", today);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("calories")
      .eq("user_id", userId)
      .gte("log_date", today);
    const totalMl = (water ?? []).reduce((s, w) => s + Number(w.amount_ml ?? 0), 0);
    const totalKcal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
    // recommendation: ~30ml per kcal/100
    const recommendedMl = Math.round(totalKcal * 1.0);
    return { totalMl, totalKcal, recommendedMl, gap: Math.max(0, recommendedMl - totalMl) };
  });

// ============ Streak freeze auto-suggest ============
export const checkStreakAtRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("last_scan_date, scan_streak_current, health_coins, streak_freeze_used_at")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) return { atRisk: false };
    const last = prof.last_scan_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const atRisk =
      last === yesterday &&
      (prof.scan_streak_current ?? 0) >= 3 &&
      prof.streak_freeze_used_at !== today;
    return {
      atRisk,
      streak: prof.scan_streak_current ?? 0,
      canFreeze: (prof.health_coins ?? 0) >= 30,
    };
  });

// ============ Smart shopping IDR estimate ============
export const estimateGroceryCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: string[] }) =>
    z.object({ items: z.array(z.string().min(1).max(100)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const text = await callAiWithGuards({
      userId,
      feature: "grocery.cost.estimate",
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Estimasi harga pasar Indonesia 2026 untuk bahan groceries. JSON array: [{item, estimatedIdr, note}].",
        },
        { role: "user", content: `Items: ${JSON.stringify(data.items)}` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    let estimates: Array<{ item: string; estimatedIdr: number; note?: string }> = [];
    try {
      estimates = m ? JSON.parse(m[0]) : [];
    } catch {}
    const totalIdr = estimates.reduce((s, e) => s + Number(e.estimatedIdr || 0), 0);
    return { estimates, totalIdr };
  });

// ============ Currency convert (multi-currency) ============
const RATES: Record<string, number> = {
  IDR: 1,
  USD: 1 / 15800,
  MYR: 1 / 3500,
  SGD: 1 / 11800,
  EUR: 1 / 17000,
};
export function convertIdr(amountIdr: number, code: string): number {
  const r = RATES[code] ?? 1;
  return Math.round(amountIdr * r * 100) / 100;
}

// ============ Family plan ============
export const createFamilyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string }) =>
    z.object({ name: z.string().min(1).max(80).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: plan, error } = await supabase
      .from("family_plans")
      .insert({ owner_id: userId, name: data.name ?? "Keluarga" })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("family_plan_members").insert({ plan_id: plan.id, user_id: userId });
    return { plan };
  });

export const listMyFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("family_plan_members")
      .select("plan_id, family_plans(id, name, owner_id)")
      .eq("user_id", userId);
    return { plans: memberships ?? [] };
  });
