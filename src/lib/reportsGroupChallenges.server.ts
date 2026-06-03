import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * For each friend_group the user belongs to that has linked at least one
 * challenge, compute the user's rank (by current_day desc, streak desc)
 * within that group's members for each linked challenge.
 */
export async function computeGroupChallengeSummary(userId: string) {
  const { data: memberships } = await supabaseAdmin
    .from("friend_group_members")
    .select("group_id")
    .eq("user_id", userId);
  const myGroupIds = (memberships ?? []).map((m) => m.group_id);
  if (myGroupIds.length === 0) return [];

  const { data: links } = await supabaseAdmin
    .from("group_challenges")
    .select("group_id, challenge_id")
    .in("group_id", myGroupIds);
  if (!links || links.length === 0) return [];

  const groupIds = Array.from(new Set(links.map((l) => l.group_id)));
  const challengeIds = Array.from(new Set(links.map((l) => l.challenge_id)));

  const [groupsRes, challengesRes, allMembersRes] = await Promise.all([
    supabaseAdmin.from("friend_groups").select("id, name").in("id", groupIds),
    supabaseAdmin.from("challenges").select("id, title, duration_days").in("id", challengeIds),
    supabaseAdmin.from("friend_group_members").select("group_id, user_id").in("group_id", groupIds),
  ]);

  const allMemberIds = Array.from(
    new Set((allMembersRes.data ?? []).map((m) => m.user_id)),
  );
  const { data: parts } = await supabaseAdmin
    .from("challenge_participants")
    .select("user_id, challenge_id, current_day, streak, status")
    .in("user_id", allMemberIds.length ? allMemberIds : ["00000000-0000-0000-0000-000000000000"])
    .in("challenge_id", challengeIds);

  const groupName = new Map((groupsRes.data ?? []).map((g) => [g.id, g.name]));
  const chMap = new Map((challengesRes.data ?? []).map((c) => [c.id, c]));
  const membersByGroup = new Map<string, string[]>();
  for (const m of allMembersRes.data ?? []) {
    if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
    membersByGroup.get(m.group_id)!.push(m.user_id);
  }

  const out: Array<{
    group: string;
    challenge: string;
    duration_days: number | null;
    my_day: number;
    my_streak: number;
    rank: number;
    total_participants: number;
    completed: boolean;
  }> = [];

  for (const link of links) {
    const members = membersByGroup.get(link.group_id) ?? [];
    const groupParts = (parts ?? []).filter(
      (p) => p.challenge_id === link.challenge_id && members.includes(p.user_id),
    );
    if (groupParts.length === 0) continue;
    groupParts.sort(
      (a, b) => (b.current_day ?? 0) - (a.current_day ?? 0) || (b.streak ?? 0) - (a.streak ?? 0),
    );
    const myIdx = groupParts.findIndex((p) => p.user_id === userId);
    const me = myIdx >= 0 ? groupParts[myIdx] : null;
    const ch = chMap.get(link.challenge_id);
    out.push({
      group: groupName.get(link.group_id) ?? "Grup",
      challenge: ch?.title ?? "Challenge",
      duration_days: ch?.duration_days ?? null,
      my_day: me?.current_day ?? 0,
      my_streak: me?.streak ?? 0,
      rank: myIdx >= 0 ? myIdx + 1 : 0,
      total_participants: groupParts.length,
      completed: me?.status === "completed",
    });
  }
  return out;
}