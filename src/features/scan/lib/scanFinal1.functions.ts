import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ============ Pet evolution from scan streak ============
function computeStage(streak: number): string {
  if (streak >= 60) return "adult";
  if (streak >= 21) return "teen";
  if (streak >= 7) return "baby";
  return "egg";
}

export const evolvePet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    const stage = computeStage(prof?.scan_streak_current ?? 0);
    const { data: pet } = await supabase
      .from("virtual_pets")
      .select("id, pet_stage")
      .eq("user_id", userId)
      .maybeSingle();
    if (pet && pet.pet_stage !== stage) {
      await supabase.from("virtual_pets").update({ pet_stage: stage }).eq("id", pet.id);
    }
    return { stage, evolved: !!(pet && pet.pet_stage !== stage) };
  });

// ============ Story comments / likes ============
export const commentOnStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string; body: string }) =>
    z.object({ storyId: z.string().uuid(), body: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("story_comments")
      .insert({ story_id: data.storyId, user_id: userId, body: data.body });
    if (error) throw error;
    return { ok: true };
  });

export const listStoryComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string }) => z.object({ storyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("story_comments")
      .select("id, body, user_id, created_at, profiles!inner(full_name, avatar_url)")
      .eq("story_id", data.storyId)
      .order("created_at", { ascending: true });
    type Comment = {
      id: string;
      body: string;
      user_id: string;
      created_at: string;
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    };
    return { comments: (rows ?? []) as unknown as Comment[] };
  });

export const toggleStoryLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { storyId: string }) => z.object({ storyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("story_likes")
      .select("user_id")
      .eq("story_id", data.storyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", data.storyId)
        .eq("user_id", userId);
      return { liked: false };
    }
    await supabase.from("story_likes").insert({ story_id: data.storyId, user_id: userId });
    return { liked: true };
  });

// ============ Public profile ============
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
