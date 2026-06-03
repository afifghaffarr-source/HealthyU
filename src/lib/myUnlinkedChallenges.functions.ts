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
    if (!ch || ch.length === 0) return [];

    // Count unique members across user's groups who haven't joined each unlinked challenge
    const { data: groupMembers } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .in("group_id", myGroupIds);
    const uniqueMemberIds = Array.from(
      new Set((groupMembers ?? []).map((m) => m.user_id)),
    );
    const { data: joined } = await supabase
      .from("challenge_participants")
      .select("user_id, challenge_id")
      .in("user_id", uniqueMemberIds.length ? uniqueMemberIds : ["00000000-0000-0000-0000-000000000000"])
      .in("challenge_id", unlinked);
    const joinedByChallenge = new Map<string, Set<string>>();
    for (const j of joined ?? []) {
      if (!joinedByChallenge.has(j.challenge_id)) joinedByChallenge.set(j.challenge_id, new Set());
      joinedByChallenge.get(j.challenge_id)!.add(j.user_id);
    }
    // Fetch preview profiles (name + avatar) for pending members
    const allPendingIds = Array.from(
      new Set(
        ch.flatMap((c) =>
          uniqueMemberIds.filter(
            (uid) => uid !== userId && !(joinedByChallenge.get(c.id)?.has(uid)),
          ),
        ),
      ),
    );
    const { data: profs } = allPendingIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allPendingIds)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return ch.map((c) => {
      const pendingIds = uniqueMemberIds.filter(
        (uid) => uid !== userId && !(joinedByChallenge.get(c.id)?.has(uid)),
      );
      const preview_members = pendingIds.slice(0, 3).map((uid) => {
        const p = profMap.get(uid);
        return {
          id: uid,
          name: p?.full_name ?? "Anggota",
          avatar_url: p?.avatar_url ?? null,
        };
      });
      return {
        ...c,
        pending_members: pendingIds.length,
        total_members: uniqueMemberIds.length,
        preview_members,
      };
    });
  });