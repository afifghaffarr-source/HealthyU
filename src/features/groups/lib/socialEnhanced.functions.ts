/**
 * Sprint 8 — Community/Social enhancement server functions
 *
 * Provides:
 *  - getNotifications           → user's notification feed (paginated)
 *  - getUnreadCount            → badge count for bell
 *  - markNotificationRead      → single mark read
 *  - markAllNotificationsRead  → bulk
 *  - getUserPosts              → posts by a specific user (for public profile)
 *  - getUserStats              → posts count, reactions received, streak, etc
 *  - searchUsers               → discover users by name
 *  - toggleReaction            → toggle emoji reaction (replaces toggleLike, supports types)
 *  - getPostReactions          → tally of each reaction type
 *  - shareAchievement          → auto-create post from PR/streak/meal/etc
 *  - notifyUser                → internal helper — insert notification row
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REACTION_TYPES = ["heart", "muscle", "fire", "clap", "laugh", "star"] as const;

// ────────────────────────────────────────────────────────────────────
// Notifications
// ────────────────────────────────────────────────────────────────────
const NotificationListInput = z.object({
  limit: z.number().int().min(1).max(50).default(30),
  only_unread: z.boolean().default(false),
});

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NotificationListInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notifications_log")
      .select("id, type, title, body, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.only_unread) q = q.eq("read", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("notifications_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { unread: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications_log")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications_log")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────
// User posts + stats (for public profile)
// ────────────────────────────────────────────────────────────────────
const UserPostsInput = z.object({
  user_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const getUserPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UserPostsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: posts, error } = await supabase
      .from("community_posts")
      .select(
        "id, user_id, content, category, share_kind, share_metadata, created_at, reaction_count",
      )
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const ids = (posts ?? []).map((p) => p.id);
    const { data: myLikes } = ids.length
      ? await supabase
          .from("community_likes")
          .select("post_id, reaction_type")
          .eq("user_id", userId)
          .in("post_id", ids)
      : { data: [] as { post_id: string; reaction_type: string }[] };

    const myReactionMap = new Map(
      (myLikes ?? []).map((l) => [l.post_id, l.reaction_type as string]),
    );

    return (posts ?? []).map((p) => ({
      ...p,
      my_reaction: myReactionMap.get(p.id) ?? null,
    }));
  });

export const getUserCommunityStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Posts count
    const { count: postsCount } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user_id);

    // Reactions received (sum across user's posts)
    const { data: reactionAgg } = await supabase
      .from("community_posts")
      .select("reaction_count")
      .eq("user_id", data.user_id);

    const reactionsReceived = (reactionAgg ?? []).reduce(
      (s, r) => s + Number(r.reaction_count ?? 0),
      0,
    );

    // Followers / following
    const { count: followers } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", data.user_id);
    const { count: following } = await supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", data.user_id);

    return {
      posts: postsCount ?? 0,
      reactions_received: reactionsReceived,
      followers: followers ?? 0,
      following: following ?? 0,
    };
  });

// ────────────────────────────────────────────────────────────────────
// User search / discover
// ────────────────────────────────────────────────────────────────────
const SearchInput = z.object({
  q: z.string().min(2).max(60),
  limit: z.number().int().min(1).max(30).default(15),
});

export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SearchInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current")
      .ilike("full_name", `%${data.q}%`)
      .neq("id", userId)
      .order("scan_streak_current", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    // Annotate with is_following
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: myFollows } = ids.length
      ? await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", ids)
      : { data: [] as { following_id: string }[] };
    const followingSet = new Set((myFollows ?? []).map((f) => f.following_id));

    return (profiles ?? []).map((p) => ({
      ...p,
      is_following: followingSet.has(p.id),
    }));
  });

// ────────────────────────────────────────────────────────────────────
// Reactions (toggle emoji)
// ────────────────────────────────────────────────────────────────────
const ToggleReactionInput = z.object({
  post_id: z.string().uuid(),
  reaction_type: z.enum(REACTION_TYPES).default("heart"),
});

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleReactionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get post owner for notification
    const { data: post } = await supabase
      .from("community_posts")
      .select("user_id, content")
      .eq("id", data.post_id)
      .maybeSingle();

    // Find existing reaction from this user (any type)
    const { data: existing } = await supabase
      .from("community_likes")
      .select("id, reaction_type")
      .eq("post_id", data.post_id)
      .eq("user_id", userId)
      .maybeSingle();

    let action: "added" | "removed" | "changed" = "added";
    if (existing) {
      if (existing.reaction_type === data.reaction_type) {
        // Toggle off — same reaction, remove
        await supabase.from("community_likes").delete().eq("id", existing.id);
        await supabase.rpc("bump_reaction_count", {
          p_post_id: data.post_id,
          p_delta: -1,
        });
        action = "removed";
      } else {
        // Change reaction type
        await supabase
          .from("community_likes")
          .update({ reaction_type: data.reaction_type })
          .eq("id", existing.id);
        action = "changed";
      }
    } else {
      // First reaction
      await supabase.from("community_likes").insert({
        post_id: data.post_id,
        user_id: userId,
        reaction_type: data.reaction_type,
      });
      await supabase.rpc("bump_reaction_count", {
        p_post_id: data.post_id,
        p_delta: 1,
      });
    }

    // Notify post owner (if not self)
    if (post && post.user_id !== userId && action !== "removed") {
      await supabase.from("notifications_log").insert({
        user_id: post.user_id,
        type: "reaction",
        title: `Seseorang bereaksi dengan ${reactionEmoji(data.reaction_type)}`,
        body: post.content.slice(0, 100),
        link: `/community#post-${data.post_id}`,
      });
    }

    return { action, reaction_type: data.reaction_type };
  });

export const getPostReactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("community_likes")
      .select("reaction_type, user_id")
      .eq("post_id", data.post_id);

    // Tally
    const tally: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of rows ?? []) {
      const t = (r.reaction_type as string) ?? "heart";
      tally[t] = (tally[t] ?? 0) + 1;
      if (r.user_id === userId) myReaction = t;
    }

    return {
      tally,
      total: rows?.length ?? 0,
      my_reaction: myReaction,
    };
  });

// ────────────────────────────────────────────────────────────────────
// Share achievement (auto-create post)
// ────────────────────────────────────────────────────────────────────
const ShareInput = z.object({
  share_kind: z.enum(["streak", "pr", "meal_plan", "fasting", "workout_complete", "goal"]),
  content: z.string().min(1).max(500),
  share_metadata: z.record(z.string(), z.unknown()).default({}),
  reference_id: z.string().uuid().nullable().optional(),
  category: z.enum(["general", "diet", "fasting", "workout", "motivation"]).default("general"),
});

const NOTIFICATION_REACTIONS = new Set(["heart", "muscle", "fire", "clap", "laugh", "star"]);
void NOTIFICATION_REACTIONS; // reserved for future use (e.g. notify on first reaction per type)

function reactionEmoji(t: string): string {
  const map: Record<string, string> = {
    heart: "❤️",
    muscle: "💪",
    fire: "🔥",
    clap: "👏",
    laugh: "😂",
    star: "⭐",
  };
  return map[t] ?? "❤️";
}

export const shareAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ShareInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        content: data.content,
        category: data.category,
        share_kind: data.share_kind,
        share_metadata: data.share_metadata as never,
        reference_id: data.reference_id ?? null,
      } as never)
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, post_id: row.id, created_at: row.created_at };
  });

// ────────────────────────────────────────────────────────────────────
// internal: notifyUser — used by other server fns (like, comment, follow)
// ────────────────────────────────────────────────────────────────────
const NotifyInput = z.object({
  target_user_id: z.string().uuid(),
  type: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  body: z.string().max(300).nullable().optional(),
  link: z.string().max(300).nullable().optional(),
});

export const notifyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NotifyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("notifications_log").insert({
      user_id: data.target_user_id,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Export constant for client-side usage
export const REACTION_EMOJI: Record<(typeof REACTION_TYPES)[number], string> = {
  heart: "❤️",
  muscle: "💪",
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  star: "⭐",
};
export { reactionEmoji, REACTION_TYPES };
