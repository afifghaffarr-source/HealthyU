import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCallAi.server";

const callAI = makeScanAiCaller("scanBatch7");

// 13. Gacha pull
const GACHA_REWARDS = [
  { label: "Coin Kecil (+5)", coins: 5, weight: 40 },
  { label: "Coin Sedang (+15)", coins: 15, weight: 25 },
  { label: "Coin Besar (+50)", coins: 50, weight: 10 },
  { label: "JACKPOT (+200)", coins: 200, weight: 2 },
  { label: "Apes (0)", coins: 0, weight: 23 },
];

export const gachaPull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const COST = 20;
    const { data: p } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    if ((p?.health_coins ?? 0) < COST) throw new Error("Coin tidak cukup");
    const total = GACHA_REWARDS.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    let chosen = GACHA_REWARDS[0];
    for (const r of GACHA_REWARDS) {
      roll -= r.weight;
      if (roll <= 0) {
        chosen = r;
        break;
      }
    }
    const newCoins = (p?.health_coins ?? 0) - COST + chosen.coins;
    await supabase.from("profiles").update({ health_coins: newCoins }).eq("id", userId);
    await supabase.from("gacha_pulls").insert({
      user_id: userId,
      cost_coins: COST,
      reward_label: chosen.label,
      reward_coins: chosen.coins,
    });
    return { reward: chosen, newCoins };
  });

// 14. Pet accessory shop
export const listPetAccessories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: shop } = await supabase.from("pet_accessories").select("*").order("cost_coins");
    const { data: owned } = await supabase
      .from("user_pet_accessories")
      .select("*")
      .eq("user_id", userId);
    return { shop: shop ?? [], owned: owned ?? [] };
  });

export const buyPetAccessory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accessoryId: string }) =>
    z.object({ accessoryId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: acc } = await supabase
      .from("pet_accessories")
      .select("*")
      .eq("id", data.accessoryId)
      .maybeSingle();
    if (!acc) throw new Error("Aksesori tidak ditemukan");
    const { data: existing } = await supabase
      .from("user_pet_accessories")
      .select("id")
      .eq("user_id", userId)
      .eq("accessory_id", data.accessoryId)
      .maybeSingle();
    if (existing) throw new Error("Sudah dimiliki");
    const { data: p } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    if ((p?.health_coins ?? 0) < acc.cost_coins) throw new Error("Coin tidak cukup");
    await supabase
      .from("profiles")
      .update({ health_coins: (p?.health_coins ?? 0) - acc.cost_coins })
      .eq("id", userId);
    await supabase.from("user_pet_accessories").insert({
      user_id: userId,
      accessory_id: data.accessoryId,
      equipped: false,
    });
    return { ok: true };
  });

export const equipPetAccessory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; equipped: boolean }) =>
    z.object({ id: z.string().uuid(), equipped: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_pet_accessories")
      .update({ equipped: data.equipped })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// 15. Habit stacks
export const listHabitStacks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("habit_stacks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    return { stacks: data ?? [] };
  });

export const createHabitStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; steps: string[] }) =>
    z
      .object({
        name: z.string().min(1).max(60),
        steps: z.array(z.string().min(1).max(80)).min(1).max(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("habit_stacks")
      .insert({ user_id: userId, name: data.name, steps: data.steps });
    return { ok: true };
  });

// 17. Family meal coordinator (vote)
export const voteFamilyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; mealName: string }) =>
    z.object({ planId: z.string().uuid(), mealName: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("family_meal_votes").insert({
      plan_id: data.planId,
      user_id: userId,
      meal_name: data.mealName,
      vote_date: today,
    });
    return { ok: true };
  });

export const getFamilyMealVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("family_meal_votes")
      .select("meal_name")
      .eq("plan_id", data.planId)
      .eq("vote_date", today);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      counts[r.meal_name] = (counts[r.meal_name] ?? 0) + 1;
    }
    return { counts };
  });

// 18. Recipe video preview (AI text description -> use as placeholder)
export const generateRecipeVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeName: string }) =>
    z.object({ recipeName: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const script = await callAI(
      `Buat storyboard video pendek (5 scene, masing-masing 1 kalimat) untuk masak ${data.recipeName}. Bahasa Indonesia.`,
      "Kamu food video director.",
    );
    return { script };
  });

// 19. AI-driven onboarding coach interview
export const coachInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string(), z.string().max(500)) }).parse(d),
  )
  .handler(async ({ data }) => {
    const summary = await callAI(
      `Berdasarkan jawaban onboarding: ${JSON.stringify(data.answers)}. Buat ringkasan profil & 3 rekomendasi awal. Bahasa Indonesia.`,
      "Kamu coach holistik.",
    );
    return { summary };
  });

// 20. Followers list
export const listFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: followerRows } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", data.userId);
    const { data: followingRows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", data.userId);
    const followerIds = (followerRows ?? []).map((r) => r.follower_id);
    const followingIds = (followingRows ?? []).map((r) => r.following_id);
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));
    type Profile = { id: string; full_name: string | null; avatar_url: string | null };
    const { data: profs } = allIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allIds)
      : { data: [] as Profile[] };
    const map = new Map<string, Profile>((profs ?? []).map((p) => [p.id, p as Profile]));
    return {
      followers: followerIds
        .map((id) => map.get(id))
        .filter((p): p is Profile => Boolean(p)),
      following: followingIds
        .map((id) => map.get(id))
        .filter((p): p is Profile => Boolean(p)),
    };
  });
