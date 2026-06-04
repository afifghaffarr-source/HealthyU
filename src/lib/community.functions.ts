import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: posts, error } = await supabase
      .from("community_posts")
      .select("id, user_id, content, category, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const ids = (posts ?? []).map((p) => p.id);
    const { data: likes } = ids.length
      ? await supabase.from("community_likes").select("post_id, user_id").in("post_id", ids)
      : { data: [] as { post_id: string; user_id: string }[] };
    const userIds = Array.from(new Set((posts ?? []).map((p) => p.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return (posts ?? []).map((p) => {
      const postLikes = (likes ?? []).filter((l) => l.post_id === p.id);
      return {
        ...p,
        author: nameMap.get(p.user_id) ?? "Sahabat",
        like_count: postLikes.length,
        liked_by_me: postLikes.some((l) => l.user_id === userId),
        is_mine: p.user_id === userId,
      };
    });
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        content: z.string().min(1).max(1000),
        category: z
          .enum(["general", "diet", "fasting", "workout", "motivation"])
          .default("general"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("community_posts").insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("community_likes")
      .select("id")
      .eq("post_id", data.post_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase.from("community_likes").delete().eq("id", existing.id);
      return { liked: false };
    }
    await supabase.from("community_likes").insert({ post_id: data.post_id, user_id: userId });
    return { liked: true };
  });
