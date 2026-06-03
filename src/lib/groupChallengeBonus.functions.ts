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
    return (res ?? { ok: false }) as {
      ok: boolean;
      coins_awarded?: number;
      reason?: string;
      completed?: number;
      total?: number;
    };
  });

export const listGroupBonusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: claimed } = await supabase
      .from("group_challenge_bonuses")
      .select("group_id, coins_awarded")
      .eq("challenge_id", data.challenge_id)
      .eq("user_id", userId);
    return new Set((claimed ?? []).map((c) => c.group_id));
  });