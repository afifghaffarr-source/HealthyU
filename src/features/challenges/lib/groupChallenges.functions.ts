import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listMyGroupsForChallenge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: memberships } = await supabase
      .from("friend_group_members")
      .select("group_id")
      .eq("user_id", userId);
    const gids = (memberships ?? []).map((m) => m.group_id);
    if (gids.length === 0) return [];
    const { data: groups } = await supabase
      .from("friend_groups")
      .select("id, name, invite_code")
      .in("id", gids);
    const { data: linked } = await supabase
      .from("group_challenges")
      .select("group_id")
      .eq("challenge_id", data.challenge_id)
      .in("group_id", gids);
    const linkedSet = new Set((linked ?? []).map((l) => l.group_id));
    return (groups ?? []).map((g) => ({ ...g, joined: linkedSet.has(g.id) }));
  });

export const inviteGroupToChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ group_id: z.string().uuid(), challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { error } = await supabase
      .from("group_challenges")
      .insert({ group_id: data.group_id, challenge_id: data.challenge_id, created_by: userId });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const leaveGroupChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ group_id: z.string().uuid(), challenge_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { error } = await supabase
      .from("group_challenges")
      .delete()
      .eq("group_id", data.group_id)
      .eq("challenge_id", data.challenge_id)
      .eq("created_by", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listChallengeGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    // groups I'm in
    const { data: mine } = await supabase
      .from("friend_group_members")
      .select("group_id")
      .eq("user_id", userId);
    const myGids = new Set((mine ?? []).map((m) => m.group_id));
    if (myGids.size === 0) return [];
    const { data: links } = await supabase
      .from("group_challenges")
      .select("group_id")
      .eq("challenge_id", data.challenge_id)
      .in("group_id", Array.from(myGids));
    const gids = (links ?? []).map((l) => l.group_id);
    if (gids.length === 0) return [];
    const { data: groups } = await supabaseAdmin
      .from("friend_groups")
      .select("id, name")
      .in("id", gids);
    return groups ?? [];
  });
