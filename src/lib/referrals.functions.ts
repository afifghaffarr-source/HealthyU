import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function generateCode(uid: string) {
  return uid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const getReferralInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, health_coins")
      .eq("id", userId)
      .maybeSingle();

    let code = profile?.referral_code ?? null;
    if (!code) {
      code = generateCode(userId);
      await supabase.from("profiles").update({ referral_code: code }).eq("id", userId);
    }

    const { data: referrals } = await supabase
      .from("referrals")
      .select("id, referred_id, status, referrer_reward_coins, completed_at, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const earned = (referrals ?? [])
      .filter((r) => r.status === "completed")
      .reduce((s, r) => s + (r.referrer_reward_coins ?? 0), 0);

    return {
      code,
      coins: profile?.health_coins ?? 0,
      total: referrals?.length ?? 0,
      completed: (referrals ?? []).filter((r) => r.status === "completed").length,
      earned,
      referrals: referrals ?? [],
    };
  });

export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ code: z.string().min(4).max(20).regex(/^[A-Z0-9]+$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: me } = await supabase
      .from("profiles")
      .select("referred_by, referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (me?.referred_by) throw new Error("Kamu sudah pernah pakai kode referral");
    if (me?.referral_code === data.code) throw new Error("Tidak bisa pakai kode sendiri");

    const { data: ref } = await supabase
      .from("profiles")
      .select("id, health_coins")
      .eq("referral_code", data.code)
      .maybeSingle();
    if (!ref) throw new Error("Kode referral tidak ditemukan");

    const REWARD_REFERRER = 100;
    const REWARD_REFERRED = 50;

    const { error: insErr } = await supabase.from("referrals").insert({
      referrer_id: ref.id,
      referred_id: userId,
      referral_code: data.code,
      referrer_reward_coins: REWARD_REFERRER,
      referred_reward_coins: REWARD_REFERRED,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    if (insErr) throw new Error(insErr.message);

    // Update referred user's profile
    const { data: myCoins } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({
        referred_by: ref.id,
        health_coins: (myCoins?.health_coins ?? 0) + REWARD_REFERRED,
      })
      .eq("id", userId);

    return { ok: true, earned: REWARD_REFERRED };
  });