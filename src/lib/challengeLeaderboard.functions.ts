import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getChallengeLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ challenge_id: z.string().uuid(), limit: z.number().int().min(1).max(50).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const limit = data.limit ?? 20;
    // use admin to read other users' profile display names (read-only)
    const { data: parts, error } = await supabaseAdmin
      .from("challenge_participants")
      .select("id, user_id, current_day, streak, coins_earned, xp_earned, status")
      .eq("challenge_id", data.challenge_id)
      .order("current_day", { ascending: false })
      .order("streak", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const ids = (parts ?? []).map((p) => p.user_id);
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
    return (parts ?? []).map((p, i) => ({
      rank: i + 1,
      user_id: p.user_id,
      is_me: p.user_id === userId,
      full_name: pmap.get(p.user_id)?.full_name ?? "Pengguna",
      avatar_url: pmap.get(p.user_id)?.avatar_url ?? null,
      current_day: p.current_day ?? 0,
      streak: p.streak ?? 0,
      xp_earned: p.xp_earned ?? 0,
      coins_earned: p.coins_earned ?? 0,
    }));
  });