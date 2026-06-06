import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== from scanBatch7a (discoverUsers, searchUsers) =====

export const discoverUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current, health_coins")
      .eq("public_profile", true)
      .order("health_coins", { ascending: false })
      .limit(30);
    return { users: data ?? [] };
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current")
      .ilike("full_name", `%${data.q}%`)
      .eq("public_profile", true)
      .limit(20);
    return { users: rows ?? [] };
  });

// ===== from scanBatch7b2 (listFollowers) =====

export const listFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: followerRows } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", data.userId);
    const { data: followingRows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", data.userId);
    const followerIds = (followerRows ?? []).map((r) => r.follower_id);
    const followingIds = (followingRows ?? []).map((r) => r.following_id);
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));
    type Profile = { id: string; full_name: string | null; avatar_url: string | null };
    const { data: profs } = allIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allIds)
      : { data: [] as Profile[] };
    const map = new Map<string, Profile>((profs ?? []).map((p) => [p.id, p as Profile]));
    return {
      followers: followerIds.map((id) => map.get(id)).filter((p): p is Profile => Boolean(p)),
      following: followingIds.map((id) => map.get(id)).filter((p): p is Profile => Boolean(p)),
    };
  });

// ===== from scanSocialA1 (getGroupScanLeaderboard) =====

export const getGroupScanLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string }) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: members } = await supabase
      .from("friend_group_members")
      .select("user_id, profiles(id, full_name, avatar_url, public_profile, scan_streak_current)")
      .eq("group_id", data.groupId);
    const rows: Array<{
      userId: string;
      name: string;
      avatar: string | null;
      streak: number;
      scans: number;
    }> = [];
    type MemberWithProfile = {
      user_id: string;
      profiles?: {
        id?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
        public_profile?: boolean | null;
        scan_streak_current?: number | null;
      } | null;
    };
    const { maskPublicProfile, ANON_NAME } = await import("@/lib/privacy");
    for (const m of (members ?? []) as MemberWithProfile[]) {
      const { count } = await supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", m.user_id)
        .gte("created_at", since);
      const masked = maskPublicProfile(
        m.profiles ? { ...m.profiles, id: m.profiles.id ?? m.user_id } : null,
        userId,
      );
      const isPrivate = m.profiles?.public_profile === false && m.user_id !== userId;
      rows.push({
        userId: m.user_id,
        name: masked?.full_name ?? ANON_NAME,
        avatar: masked?.avatar_url ?? null,
        streak: isPrivate ? 0 : (m.profiles?.scan_streak_current ?? 0),
        scans: isPrivate ? 0 : (count ?? 0),
      });
    }
    rows.sort((a, b) => b.scans - a.scans || b.streak - a.streak);
    return { rows };
  });

// ===== from scanBatch8b1 (getPublicProfileMeta) =====

export const getPublicProfileMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("full_name, avatar_url, scan_streak_current, health_coins, public_profile")
      .eq("id", data.userId)
      .maybeSingle();
    if (!p?.public_profile) return { profile: null };
    return { profile: p };
  });

// ===== from scanFinal1 (getPublicProfile) =====

export const getPublicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current, scan_streak_longest, public_profile")
      .eq("id", data.userId)
      .maybeSingle();
    if (!prof) throw new Error("Not found");
    if (!prof.public_profile && prof.id !== userId) throw new Error("Profil ini privat");
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at, achievements(title, icon)")
      .eq("user_id", data.userId)
      .order("unlocked_at", { ascending: false })
      .limit(12);
    const { count: followers } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", data.userId);
    const { count: following } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", data.userId);
    const { data: isFollowing } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", data.userId)
      .maybeSingle();
    return {
      profile: prof,
      achievements: achievements ?? [],
      followers: followers ?? 0,
      following: following ?? 0,
      isFollowing: !!isFollowing,
    };
  });

// ===== from scanSocialB (followUser, unfollowUser) =====

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.targetId === userId) throw new Error("Tidak bisa follow diri sendiri");
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: userId, following_id: data.targetId });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", data.targetId);
    return { ok: true };
  });
