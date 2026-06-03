import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getChallengeLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      challenge_id: z.string().uuid(),
      limit: z.number().int().min(1).max(50).optional(),
      friends_only: z.boolean().optional(),
      group_id: z.string().uuid().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const limit = data.limit ?? 20;

    let friendIds: string[] | null = null;
    if (data.group_id) {
      // verify membership then list members
      const { data: me } = await supabase
        .from("friend_group_members")
        .select("group_id")
        .eq("user_id", userId)
        .eq("group_id", data.group_id)
        .maybeSingle();
      if (!me) {
        friendIds = [userId];
      } else {
        const { data: members } = await supabaseAdmin
          .from("friend_group_members")
          .select("user_id")
          .eq("group_id", data.group_id);
        friendIds = (members ?? []).map((m) => m.user_id);
      }
    } else if (data.friends_only) {
      // groups I'm in
      const { data: myGroups } = await supabase
        .from("friend_group_members")
        .select("group_id")
        .eq("user_id", userId);
      const gids = (myGroups ?? []).map((g) => g.group_id);
      if (gids.length === 0) {
        friendIds = [userId];
      } else {
        const { data: members } = await supabaseAdmin
          .from("friend_group_members")
          .select("user_id")
          .in("group_id", gids);
        const set = new Set<string>((members ?? []).map((m) => m.user_id));
        set.add(userId);
        friendIds = Array.from(set);
      }
    }

    // use admin to read other users' profile display names (read-only)
    let q = supabaseAdmin
      .from("challenge_participants")
      .select("id, user_id, current_day, streak, coins_earned, xp_earned, status")
      .eq("challenge_id", data.challenge_id);
    if (friendIds) q = q.in("user_id", friendIds);
    const { data: parts, error } = await q
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