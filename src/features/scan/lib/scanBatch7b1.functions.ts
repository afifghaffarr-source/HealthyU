import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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