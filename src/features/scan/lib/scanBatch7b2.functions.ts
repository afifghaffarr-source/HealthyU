import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCallAi.server";

const callAI = makeScanAiCaller("scanBatch7");

export const voteFamilyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; mealName: string }) =>
    z.object({ planId: z.string().uuid(), mealName: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("family_meal_votes").insert({
      plan_id: data.planId,
      user_id: userId,
      meal_name: data.mealName,
      vote_date: today,
    });
    return { ok: true };
  });

export const getFamilyMealVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("family_meal_votes")
      .select("meal_name")
      .eq("plan_id", data.planId)
      .eq("vote_date", today);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      counts[r.meal_name] = (counts[r.meal_name] ?? 0) + 1;
    }
    return { counts };
  });

export const generateRecipeVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeName: string }) =>
    z.object({ recipeName: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const script = await callAI(
      `Buat storyboard video pendek (5 scene, masing-masing 1 kalimat) untuk masak ${data.recipeName}. Bahasa Indonesia.`,
      "Kamu food video director.",
    );
    return { script };
  });

export const coachInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string(), z.string().max(500)) }).parse(d),
  )
  .handler(async ({ data }) => {
    const summary = await callAI(
      `Berdasarkan jawaban onboarding: ${JSON.stringify(data.answers)}. Buat ringkasan profil & 3 rekomendasi awal. Bahasa Indonesia.`,
      "Kamu coach holistik.",
    );
    return { summary };
  });

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
      followers: followerIds
        .map((id) => map.get(id))
        .filter((p): p is Profile => Boolean(p)),
      following: followingIds
        .map((id) => map.get(id))
        .filter((p): p is Profile => Boolean(p)),
    };
  });