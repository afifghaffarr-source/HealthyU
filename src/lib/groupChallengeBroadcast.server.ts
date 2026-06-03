import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPushTo } from "@/lib/push.server";

type PushSub = { endpoint: string; p256dh: string; auth: string };

/**
 * Notify other members of any friend_group that already linked this challenge
 * (via group_challenges) and that the joining user belongs to.
 * Respects notification_preferences.challenge_enabled.
 */
export async function broadcastGroupChallengeJoin(args: {
  userId: string;
  challengeId: string;
}) {
  const { userId, challengeId } = args;

  // 1. Groups the user is in
  const { data: myMemberships } = await supabaseAdmin
    .from("friend_group_members")
    .select("group_id")
    .eq("user_id", userId);
  const myGroupIds = (myMemberships ?? []).map((m) => m.group_id);
  if (myGroupIds.length === 0) return { sent: 0 };

  // 2. Of those groups, which already linked this challenge
  const { data: links } = await supabaseAdmin
    .from("group_challenges")
    .select("group_id")
    .eq("challenge_id", challengeId)
    .in("group_id", myGroupIds);
  const activeGroupIds = (links ?? []).map((l) => l.group_id);
  if (activeGroupIds.length === 0) return { sent: 0 };

  // 3. Other members of those groups
  const { data: members } = await supabaseAdmin
    .from("friend_group_members")
    .select("user_id, group_id")
    .in("group_id", activeGroupIds);
  const otherIds = Array.from(
    new Set((members ?? []).map((m) => m.user_id).filter((id) => id !== userId)),
  );
  if (otherIds.length === 0) return { sent: 0 };

  // 4. Filter by notification preferences (challenge_enabled)
  const { data: prefs } = await supabaseAdmin
    .from("notification_preferences")
    .select("user_id, challenge_enabled")
    .in("user_id", otherIds);
  const allowed = new Set(
    (prefs ?? []).filter((p) => p.challenge_enabled !== false).map((p) => p.user_id),
  );
  // Users without a prefs row default to allowed
  const haveRow = new Set((prefs ?? []).map((p) => p.user_id));
  const recipients = otherIds.filter((id) => !haveRow.has(id) || allowed.has(id));
  if (recipients.length === 0) return { sent: 0 };

  // 5. Joiner name for nicer copy
  const { data: meProf } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const { data: ch } = await supabaseAdmin
    .from("challenges")
    .select("title")
    .eq("id", challengeId)
    .maybeSingle();
  const joinerName = meProf?.full_name ?? "Teman grup kamu";
  const title = "Challenge bareng dimulai 🚀";
  const body = `${joinerName} baru gabung "${ch?.title ?? "challenge"}". Ayo gabung juga!`;

  // 6. Look up push subs and send
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", recipients);

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await sendWebPushTo(s as PushSub, {
          title,
          body,
          url: "/challenges",
          tag: `gc-${challengeId}`,
        });
        sent++;
      } catch (e) {
        console.error("push fail", (e as Error).message);
      }
    }),
  );
  return { sent };
}

/**
 * Notify other members of the group when someone successfully claims the
 * group challenge bonus — positive FOMO.
 */
export async function broadcastGroupBonusClaim(args: {
  userId: string;
  groupId: string;
  challengeId: string;
  coins: number;
}) {
  const { userId, groupId, challengeId, coins } = args;

  const { data: members } = await supabaseAdmin
    .from("friend_group_members")
    .select("user_id")
    .eq("group_id", groupId);
  const otherIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== userId);
  if (otherIds.length === 0) return { sent: 0 };

  const { data: prefs } = await supabaseAdmin
    .from("notification_preferences")
    .select("user_id, challenge_enabled")
    .in("user_id", otherIds);
  const denied = new Set(
    (prefs ?? []).filter((p) => p.challenge_enabled === false).map((p) => p.user_id),
  );
  const recipients = otherIds.filter((id) => !denied.has(id));
  if (recipients.length === 0) return { sent: 0 };

  const [{ data: meProf }, { data: ch }, { data: grp }] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("challenges").select("title").eq("id", challengeId).maybeSingle(),
    supabaseAdmin.from("friend_groups").select("name").eq("id", groupId).maybeSingle(),
  ]);
  const name = meProf?.full_name ?? "Anggota grup";
  const title = "Bonus grup diklaim 💰";
  const body = `${name} dapat ${coins} koin dari "${ch?.title ?? "challenge"}" di grup ${grp?.name ?? ""}. Klaim punyamu!`;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", recipients);

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await sendWebPushTo(s as PushSub, {
          title,
          body,
          url: "/challenges",
          tag: `gc-bonus-${challengeId}`,
        });
        sent++;
      } catch (e) {
        console.error("push fail", (e as Error).message);
      }
    }),
  );
  return { sent };
}