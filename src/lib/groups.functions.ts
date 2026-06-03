import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join("");
}

export const listMyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships, error } = await supabase
      .from("friend_group_members")
      .select("group_id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (memberships ?? []).map((m) => m.group_id);
    if (!ids.length) return [] as Array<{ id: string; name: string; invite_code: string; owner_id: string; member_count: number }>;
    const { data: groups, error: gErr } = await supabase
      .from("friend_groups")
      .select("id, name, invite_code, owner_id")
      .in("id", ids);
    if (gErr) throw new Error(gErr.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: counts } = await supabaseAdmin
      .from("friend_group_members")
      .select("group_id")
      .in("group_id", ids);
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((c) => countMap.set(c.group_id, (countMap.get(c.group_id) ?? 0) + 1));
    return (groups ?? []).map((g) => ({ ...g, member_count: countMap.get(g.id) ?? 0 }));
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await supabase
        .from("friend_groups")
        .select("id")
        .eq("invite_code", code)
        .maybeSingle();
      if (!exists) break;
      code = genCode();
    }
    const { data: g, error } = await supabase
      .from("friend_groups")
      .insert({ name: data.name, owner_id: userId, invite_code: code })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await supabase
      .from("friend_group_members")
      .insert({ group_id: g.id, user_id: userId });
    if (mErr) throw new Error(mErr.message);
    return { id: g.id, invite_code: code };
  });

export const joinGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ invite_code: z.string().min(4).max(12).regex(/^[A-Z0-9]+$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: g, error } = await supabaseAdmin
      .from("friend_groups")
      .select("id, name")
      .eq("invite_code", data.invite_code.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) throw new Error("Kode undangan tidak ditemukan");
    const { error: mErr } = await supabase
      .from("friend_group_members")
      .insert({ group_id: g.id, user_id: userId });
    if (mErr && !mErr.message.includes("duplicate")) throw new Error(mErr.message);
    return { id: g.id, name: g.name };
  });

export const leaveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ group_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("friend_group_members")
      .delete()
      .eq("group_id", data.group_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGroupLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ group_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: group, error: gErr } = await supabase
      .from("friend_groups")
      .select("id, name, invite_code, owner_id")
      .eq("id", data.group_id)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!group) throw new Error("Grup tidak ditemukan atau Anda bukan anggota");
    const { data: members, error: mErr } = await supabase
      .from("friend_group_members")
      .select("user_id")
      .eq("group_id", data.group_id);
    if (mErr) throw new Error(mErr.message);
    const ids = (members ?? []).map((m) => m.user_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: stats }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("user_stats")
        .select("user_id, xp, level, current_streak")
        .in("user_id", ids),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
    ]);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const statMap = new Map((stats ?? []).map((s) => [s.user_id, s]));
    const rows = ids
      .map((id) => {
        const s = statMap.get(id);
        return {
          user_id: id,
          name: nameMap.get(id) ?? "Sahabat",
          xp: s?.xp ?? 0,
          level: s?.level ?? 1,
          current_streak: s?.current_streak ?? 0,
          is_me: id === userId,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return { group, members: rows };
  });