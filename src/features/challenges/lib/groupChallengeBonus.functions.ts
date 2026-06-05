import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimGroupChallengeBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ group_id: z.string().uuid(), challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("claim_group_challenge_bonus", {
      p_group_id: data.group_id,
      p_challenge_id: data.challenge_id,
    });
    if (error) throw new Error(error.message);
    const result = (res ?? { ok: false }) as {
      ok: boolean;
      coins_awarded?: number;
      reason?: string;
      completed?: number;
      total?: number;
    };
    if (result.ok && result.coins_awarded) {
      try {
        const { broadcastGroupBonusClaim } = await import("./groupChallengeBroadcast.server");
        await broadcastGroupBonusClaim({
          userId: context.userId,
          groupId: data.group_id,
          challengeId: data.challenge_id,
          coins: result.coins_awarded,
        });
      } catch (e) {
        console.error("broadcastGroupBonusClaim failed", (e as Error).message);
      }
    }
    return result;
  });

export const listGroupBonusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: claimed } = await supabase
      .from("group_challenge_bonuses")
      .select("group_id, coins_awarded")
      .eq("challenge_id", data.challenge_id)
      .eq("user_id", userId);
    return (claimed ?? []).map((c) => c.group_id);
  });

export const listGroupBonusClaimers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ group_id: z.string().uuid(), challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("group_challenge_bonuses")
      .select("user_id, coins_awarded, created_at")
      .eq("group_id", data.group_id)
      .eq("challenge_id", data.challenge_id)
      .order("created_at", { ascending: true });
    const ids = (rows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "Anggota"]));
    return (rows ?? []).map((r) => ({
      user_id: r.user_id,
      name: nameMap.get(r.user_id) ?? "Anggota",
      coins: r.coins_awarded,
      at: r.created_at,
    }));
  });
