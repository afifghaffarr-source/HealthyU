import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { maskPublicProfile, ANON_NAME } from "@/lib/privacy";

export const listLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stats, error } = await supabaseAdmin
      .from("user_stats")
      .select("user_id, xp, level, current_streak, longest_streak")
      .order("xp", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (stats ?? []).map((s) => s.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, avatar_url, public_profile")
          .in("id", ids)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null; public_profile: boolean | null }[] };
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (stats ?? []).map((s, i) => {
      const prof = profMap.get(s.user_id);
      const masked = maskPublicProfile(prof ?? null, userId);
      const isPrivate = prof?.public_profile === false && s.user_id !== userId;
      return {
        rank: i + 1,
        user_id: s.user_id,
        name: masked?.full_name ?? ANON_NAME,
        xp: isPrivate ? 0 : s.xp,
        level: isPrivate ? 0 : s.level,
        current_streak: isPrivate ? 0 : s.current_streak,
        longest_streak: isPrivate ? 0 : s.longest_streak,
        is_me: s.user_id === userId,
      };
    });
    void supabase;
  });

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comments, error } = await supabase
      .from("community_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", data.post_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, public_profile")
          .in("id", ids)
      : { data: [] as { id: string; full_name: string | null; public_profile: boolean | null }[] };
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (comments ?? []).map((c) => {
      const prof = profMap.get(c.user_id);
      const masked = maskPublicProfile(prof ?? null, userId);
      return {
        ...c,
        author: masked?.full_name ?? ANON_NAME,
        is_mine: c.user_id === userId,
      };
    });
  });

export const createComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ post_id: z.string().uuid(), content: z.string().min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("community_comments")
      .insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
