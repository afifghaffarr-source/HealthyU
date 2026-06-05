import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [rewardsRes, profileRes, redemptionsRes] = await Promise.all([
      supabase
        .from("coin_rewards")
        .select(
          "id, name, description, image_url, category, partner_name, coin_cost, remaining_stock, monetary_value_idr",
        )
        .eq("is_active", true)
        .order("coin_cost", { ascending: true }),
      supabase.from("profiles").select("health_coins").eq("id", userId).maybeSingle(),
      supabase
        .from("coin_redemptions")
        .select("id, reward_id, coins_spent, delivery_status, redeemed_at")
        .eq("user_id", userId)
        .order("redeemed_at", { ascending: false })
        .limit(20),
    ]);
    return {
      rewards: rewardsRes.data ?? [],
      coins: profileRes.data?.health_coins ?? 0,
      redemptions: redemptionsRes.data ?? [],
    };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ reward_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: reward } = await supabase
      .from("coin_rewards")
      .select("id, name, coin_cost, remaining_stock, is_active")
      .eq("id", data.reward_id)
      .maybeSingle();
    if (!reward || !reward.is_active) throw new Error("Reward tidak tersedia");
    if (reward.remaining_stock !== null && reward.remaining_stock <= 0)
      throw new Error("Stok habis");

    const { data: profile } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    const coins = profile?.health_coins ?? 0;
    if (coins < reward.coin_cost) throw new Error("Koin tidak cukup");

    const { error: redErr } = await supabase.from("coin_redemptions").insert({
      user_id: userId,
      reward_id: reward.id,
      coins_spent: reward.coin_cost,
      delivery_status: "pending",
    });
    if (redErr) throw new Error(redErr.message);

    await supabase
      .from("profiles")
      .update({ health_coins: coins - reward.coin_cost })
      .eq("id", userId);

    return { ok: true, remaining_coins: coins - reward.coin_cost };
  });
