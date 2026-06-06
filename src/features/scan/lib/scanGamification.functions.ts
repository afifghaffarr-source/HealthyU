import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ===== from scanBatch7b1 =====

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

// ===== from scanBatch9a (claimDailyLoginBonus) =====

export const claimDailyLoginBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("daily_login_bonuses")
      .select("*")
      .eq("user_id", userId)
      .eq("bonus_date", today)
      .maybeSingle();
    if (existing) return { bonus: existing, alreadyClaimed: true };
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data: prev } = await supabase
      .from("daily_login_bonuses")
      .select("streak")
      .eq("user_id", userId)
      .eq("bonus_date", yesterday)
      .maybeSingle();
    const streak = (prev?.streak ?? 0) + 1;
    const coins = Math.min(5 + (streak - 1) * 2, 50);
    const { data: row, error } = await supabase
      .from("daily_login_bonuses")
      .insert({ user_id: userId, bonus_date: today, coins, streak })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .rpc("increment_coins" as never, { p_user: userId, p_amount: coins } as never)
      .then(
        () => {},
        () => {},
      );
    return { bonus: row, alreadyClaimed: false };
  });

// ===== from scanMore1 (recordScanGameify, checkScanLimit) =====

export const recordScanGameify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_streak_current, scan_streak_longest, last_scan_date, health_coins")
      .eq("id", userId)
      .maybeSingle();
    let streak = prof?.scan_streak_current ?? 0;
    let longest = prof?.scan_streak_longest ?? 0;
    const last = prof?.last_scan_date;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      await supabase
        .from("profiles")
        .update({
          scan_streak_current: streak,
          scan_streak_longest: longest,
          last_scan_date: today,
          health_coins: (prof?.health_coins ?? 0) + 5,
        })
        .eq("id", userId);
    }
    // Achievement check
    const { count: mealCount } = await supabase
      .from("meal_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const unlocked: string[] = [];
    const checks: Array<{ id: string; ok: boolean }> = [
      { id: "scan_streak_7", ok: streak >= 7 },
      { id: "scan_streak_30", ok: streak >= 30 },
      { id: "meals_100", ok: (mealCount ?? 0) >= 100 },
      { id: "meals_500", ok: (mealCount ?? 0) >= 500 },
    ];
    for (const c of checks) {
      if (!c.ok) continue;
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: c.id });
      if (!error) unlocked.push(c.id);
    }
    return { streak, longest, unlocked, coinsAwarded: last !== today ? 5 : 0 };
  });

export const checkScanLimit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: prof }, { count }] = await Promise.all([
      supabase.from("profiles").select("daily_scan_limit").eq("id", userId).maybeSingle(),
      supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`),
    ]);
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const isPro = !!sub;
    const limit = isPro ? 9999 : (prof?.daily_scan_limit ?? 10);
    const used = count ?? 0;
    return { used, limit, remaining: Math.max(0, limit - used), isPro };
  });

// ===== from scanFinal1 (evolvePet) =====

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
