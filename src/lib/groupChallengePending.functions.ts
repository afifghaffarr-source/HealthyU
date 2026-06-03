import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns up to 3 members of `group_id` who have not yet joined `challenge_id`,
 * plus the total pending count. Used for stacked avatars in GroupInviter.
 */
export const groupChallengePendingMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ group_id: z.string().uuid(), challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: members } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (memberIds.length === 0) return { preview: [], pending: 0, total: 0 };
    const { data: joined } = await supabase
      .from("challenge_participants")
      .select("user_id")
      .eq("challenge_id", data.challenge_id)
      .in("user_id", memberIds);
    const joinedSet = new Set((joined ?? []).map((j) => j.user_id));
    const pendingIds = memberIds.filter((id) => id !== userId && !joinedSet.has(id));
    const previewIds = pendingIds.slice(0, 3);
    const { data: profs } = previewIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", previewIds)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return {
      preview: previewIds.map((id) => ({
        id,
        name: profMap.get(id)?.full_name ?? "Anggota",
        avatar_url: profMap.get(id)?.avatar_url ?? null,
      })),
      pending: pendingIds.length,
      total: memberIds.length,
    };
  });