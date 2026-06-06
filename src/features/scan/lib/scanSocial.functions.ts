import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

// ===== from scanSocialB (createMealStory, listStoriesFeed) =====

export const createMealStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caption?: string; imageUrl?: string; mealLogId?: string }) =>
    z
      .object({
        caption: z.string().max(280).optional(),
        imageUrl: z.string().url().optional(),
        mealLogId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: story, error } = await supabase
      .from("meal_stories")
      .insert({
        user_id: userId,
        caption: data.caption,
        image_url: data.imageUrl,
        meal_log_id: data.mealLogId,
      })
      .select()
      .single();
    if (error) throw error;
    return { story };
  });

export const listStoriesFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("meal_stories")
      .select(
        "id, user_id, caption, image_url, created_at, expires_at, profiles!inner(full_name, avatar_url)",
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    return { stories: data ?? [] };
  });

// ===== from scanFinal1 (commentOnStory, listStoryComments, toggleStoryLike) =====

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

// ===== from scanSocialA2 (doctorChat) =====

export const doctorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string }) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: meds } = await supabase
      .from("medications")
      .select("name, dosage, frequency")
      .eq("user_id", userId);
    const { data: cond } = await supabase
      .from("user_health_conditions")
      .select("condition_name, severity")
      .eq("user_id", userId);
    const { data: allergies } = await supabase
      .from("user_allergies")
      .select("allergen, severity")
      .eq("user_id", userId);
    const ctx = `Medications: ${JSON.stringify(meds ?? [])}\nConditions: ${JSON.stringify(cond ?? [])}\nAlergi: ${JSON.stringify(allergies ?? [])}`;
    const reply = await callAiWithGuards({
      userId,
      feature: "doctor.chat",
      messages: [
        {
          role: "system",
          content:
            "Kamu AI health advisor (BUKAN dokter). Berikan info edukasi singkat & sarankan konsultasi tenaga medis. Bahasa Indonesia. Pertimbangkan konteks pengguna.",
        },
        { role: "system", content: ctx },
        { role: "user", content: data.message },
      ],
    });
    return { reply };
  });

// ===== from scanBatch9b (recordStoryPhoto) =====

export const recordStoryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        storagePath: z.string().min(1).max(500),
        storyId: z.string().uuid().optional(),
        caption: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("story_photos")
      .insert({
        user_id: context.userId,
        storage_path: data.storagePath,
        story_id: data.storyId ?? null,
        caption: data.caption ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { photo: row };
  });

// ===== from scanBatch10 (createStoryPhotoUploadUrl) =====

export const createStoryPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        filename: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9._-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/stories/${Date.now()}-${data.filename}`;
    const { data: signed, error } = await context.supabase.storage
      .from("scan-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// Backward-compat re-exports (previously accessible via barrel)
export { useStreakFreeze, reverseCalorie } from "./scanMisc.functions";
export { getGroupScanLeaderboard, followUser, unfollowUser } from "./scanDiscovery.functions";
export { getDailyChallenge, completeDailyChallenge } from "./scanContent.functions";
export { remixRecipe, getGroceryFromPlan } from "./scanMeal.functions";
export { getWorkoutMatch } from "./scanWellness.functions";
export { getSleepMealCorrelation } from "./scanReports.functions";
