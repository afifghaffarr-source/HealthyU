import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns active challenges the user has joined where none of the user's
 * friend groups have linked the challenge yet. Used to surface a
 * "Ajak grup ikut challenge" card on the dashboard.
 */
export const myUnlinkedJoinedChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: parts }, { data: memberships }] = await Promise.all([
      supabase
        .from("challenge_participants")
        .select("challenge_id, status")
        .eq("user_id", userId),
      supabase
        .from("friend_group_members")
        .select("group_id")
        .eq("user_id", userId),
    ]);
    const joinedIds = Array.from(
      new Set(
        (parts ?? [])
          .filter((p) => p.status !== "completed" && p.status !== "abandoned")
          .map((p) => p.challenge_id),
      ),
    );
    const myGroupIds = (memberships ?? []).map((m) => m.group_id);
    if (joinedIds.length === 0 || myGroupIds.length === 0) return [];

    const { data: links } = await supabase
      .from("group_challenges")
      .select("challenge_id, group_id")
      .in("group_id", myGroupIds)
      .in("challenge_id", joinedIds);
    const linkedIds = new Set((links ?? []).map((l) => l.challenge_id));
    const unlinked = joinedIds.filter((id) => !linkedIds.has(id));
    if (unlinked.length === 0) return [];

    const { data: ch } = await supabase
      .from("challenges")
      .select("id, title, duration_days")
      .in("id", unlinked);
    return ch ?? [];
  });