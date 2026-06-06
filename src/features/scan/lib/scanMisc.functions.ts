import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";

const callAI = makeScanAiCaller("scanBatch7");

// ===== from scanBatch8b1 (restaurantsNearby, convertCurrency) =====

export const restaurantsNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; radiusKm?: number }) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().min(0.5).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const r = data.radiusKm ?? 5;
    const latDelta = r / 111;
    const lngDelta = r / (111 * Math.cos((data.lat * Math.PI) / 180));
    const { data: rows } = await supabase
      .from("restaurants_nearby")
      .select("*")
      .gte("lat", data.lat - latDelta)
      .lte("lat", data.lat + latDelta)
      .gte("lng", data.lng - lngDelta)
      .lte("lng", data.lng + lngDelta)
      .limit(30);
    return { restaurants: rows ?? [] };
  });

export const convertCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; from: string; to: string }) =>
    z.object({ amount: z.number(), from: z.string().length(3), to: z.string().length(3) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.from === data.to) return { converted: data.amount, rate: 1 };
    const { data: row } = await supabase
      .from("currency_rates")
      .select("rate, fetched_at")
      .eq("base", data.from)
      .eq("quote", data.to)
      .maybeSingle();
    const stale = !row || Date.now() - new Date(row.fetched_at).getTime() > 6 * 3600 * 1000;
    if (stale) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${data.from}`);
        const j = await res.json();
        const rate = j.rates?.[data.to];
        if (rate) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("currency_rates").upsert(
            {
              base: data.from,
              quote: data.to,
              rate,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "base,quote" },
          );
          return { converted: data.amount * rate, rate };
        }
      } catch {}
    }
    const rate = row?.rate ?? 1;
    return { converted: data.amount * rate, rate };
  });

// ===== from scanBatch9a (addRecipeReview, listRecipeReviews) =====

export const addRecipeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        recipeId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        review: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("recipe_reviews")
      .upsert(
        {
          recipe_id: data.recipeId,
          user_id: userId,
          rating: data.rating,
          review: data.review ?? null,
        },
        { onConflict: "recipe_id,user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { review: row };
  });

export const listRecipeReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("recipe_reviews")
      .select("id, rating, review, created_at, user_id")
      .eq("recipe_id", data.recipeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [] };
  });

// ===== from scanBatch10 (transcribeVoice, upsertThemePref, getThemePref, createFriendInvite, redeemFriendInvite) =====

export const createFriendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = crypto.randomUUID().slice(0, 12);
    const { data, error } = await context.supabase
      .from("friend_invites")
      .insert({ inviter_id: context.userId, token })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { invite: data };
  });

export const redeemFriendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(6).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("friend_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !inv) throw new Error("Token tidak valid");
    if (inv.inviter_id === context.userId) throw new Error("Tidak bisa redeem sendiri");
    if (inv.used_by) throw new Error("Token sudah dipakai");
    await context.supabase
      .from("friend_invites")
      .update({ used_by: context.userId, used_at: new Date().toISOString() })
      .eq("id", inv.id);
    return { ok: true, inviter: inv.inviter_id };
  });

export const upsertThemePref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        mode: z.enum(["auto", "light", "dark"]),
        lat: z.number().optional(),
        lon: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("theme_preferences")
      .upsert(
        {
          user_id: context.userId,
          mode: data.mode,
          sunset_lat: data.lat ?? null,
          sunset_lon: data.lon ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { pref: row };
  });

export const getThemePref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("theme_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { pref: data };
  });

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        audioBase64: z.string().min(10),
        mimeType: z.string().default("audio/webm"),
        source: z.string().default("mood"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = await callAiWithGuards({
      userId: context.userId,
      feature: "voice.transcribe",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transkripsikan audio bahasa Indonesia berikut secara ringkas. Jawab teks transkrip saja.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: data.audioBase64,
                format: data.mimeType.split("/")[1] ?? "webm",
              },
            },
          ],
        },
      ],
    });
    const transcript = text.trim();
    const { data: row, error } = await context.supabase
      .from("voice_transcripts")
      .insert({
        user_id: context.userId,
        source: data.source,
        transcript,
        metadata: { mimeType: data.mimeType } as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { transcript, record: row };
  });

// ===== from scanBatch11 (donateCoins, reorderShowcase) =====

export const donateCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        coins: z.number().int().min(10).max(10000),
        charityName: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .single();
    if (!prof || (prof.health_coins ?? 0) < data.coins) throw new Error("Coin tidak cukup");
    const { data: row, error } = await supabase
      .from("charity_donations")
      .insert({ user_id: userId, coins_spent: data.coins, charity_name: data.charityName })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("profiles")
      .update({ health_coins: (prof.health_coins ?? 0) - data.coins })
      .eq("id", userId);
    return { donation: row };
  });

export const reorderShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order: z.array(z.string().uuid()).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("achievement_showcase_order").delete().eq("user_id", userId);
    if (data.order.length) {
      const rows = data.order.map((aid, i) => ({
        user_id: userId,
        achievement_id: aid,
        position: i,
      }));
      const { error } = await supabase.from("achievement_showcase_order").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== from scanBatch12a (getWeeklyLeaderboard, upsertWeeklyScore, getSubscription, upgradeSubscription) =====

export const getWeeklyLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const monday = new Date();
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const week = monday.toISOString().slice(0, 10);
    const { data } = await context.supabase
      .from("weekly_leaderboard")
      .select("user_id, score, rank")
      .eq("week_start", week)
      .order("score", { ascending: false })
      .limit(50);
    return { week, rows: data ?? [] };
  });

export const upsertWeeklyScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ score: z.number().int().min(0).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    const monday = new Date();
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const week = monday.toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("weekly_leaderboard")
      .upsert(
        { user_id: context.userId, week_start: week, score: data.score },
        { onConflict: "user_id,week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { sub: data ?? { tier: "free", status: "active" } };
  });

export const upgradeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tier: z.enum(["free", "pro", "ultimate"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await context.supabase.from("subscriptions").upsert(
      {
        user_id: context.userId,
        tier: data.tier,
        status: "active",
        current_period_end: periodEnd,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, tier: data.tier };
  });

// ===== from scanBatch12b (analyzeFormCheck) =====

const FormCheckSchema = z.object({
  score: z.number().optional(),
  mistakes: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
});

export const analyzeFormCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ exercise: z.string().min(1).max(100), description: z.string().min(5).max(2000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let feedback: { score?: number; mistakes?: string[]; tips?: string[]; raw?: string } = {};
    try {
      feedback = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "workout.form_check",
        schema: FormCheckSchema,
        fallback: { mistakes: [], tips: [] },
        messages: [
          {
            role: "system",
            content:
              "Coach fitness. Balas JSON: {score:1-10, mistakes:[], tips:[]}. Tanpa markdown.",
          },
          {
            role: "user",
            content: `Latihan: ${data.exercise}\nDeskripsi gerakan: ${data.description}`,
          },
        ],
      });
    } catch (e) {
      feedback = { raw: (e as Error).message };
    }
    const { data: row } = await context.supabase
      .from("form_check_sessions")
      .insert({
        user_id: context.userId,
        exercise: data.exercise,
        ai_feedback: feedback as never,
      })
      .select()
      .single();
    return { session: row, feedback };
  });

// ===== from scanBatch7a (smartMealReminderPattern) =====

export const smartMealReminderPattern = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("meal_logs")
      .select("meal_type, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since);
    const buckets: Record<string, number[]> = {};
    for (const m of data ?? []) {
      if (!m.logged_at || !m.meal_type) continue;
      const h = new Date(m.logged_at).getHours();
      if (!buckets[m.meal_type]) buckets[m.meal_type] = [];
      buckets[m.meal_type].push(h);
    }
    const recommended: Record<string, number> = {};
    Object.entries(buckets).forEach(([k, arr]) => {
      recommended[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });
    return { recommended };
  });

// ===== from scanSocialA1 (reverseCalorie, useStreakFreeze) =====

export const reverseCalorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetCalories: number }) =>
    z.object({ targetCalories: z.number().min(50).max(3000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await callAiWithGuards({
      userId: null,
      feature: "social.reverse_calorie",
      skipBudget: true,
      messages: [
        {
          role: "system",
          content:
            "Kamu ahli gizi Indonesia. Berikan 5 saran makanan/menu yang totalnya mendekati target kalori. Format JSON array: [{name, calories, protein_g, carbs_g, fat_g, why}].",
        },
        { role: "user", content: `Target ${data.targetCalories} kkal. Berikan opsi praktis.` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    type Suggestion = {
      name: string;
      calories: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      why?: string;
    };
    let suggestions: Suggestion[] = [];
    try {
      const parsed = m ? JSON.parse(m[0]) : [];
      suggestions = Array.isArray(parsed) ? (parsed as Suggestion[]) : [];
    } catch {}
    return { suggestions };
  });

export const useStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins, streak_freeze_used_at, last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if ((prof.health_coins ?? 0) < 30) throw new Error("Coin tidak cukup (butuh 30)");
    if (prof.streak_freeze_used_at === today) throw new Error("Sudah dipakai hari ini");
    await supabase
      .from("profiles")
      .update({
        health_coins: (prof.health_coins ?? 0) - 30,
        streak_freeze_used_at: today,
        last_scan_date: today,
      })
      .eq("id", userId);
    return { ok: true, streak: prof.scan_streak_current };
  });

// ===== from scanBatch7b2 (generateRecipeVideoScript, coachInterview) =====

export const generateRecipeVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeName: string }) =>
    z.object({ recipeName: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const script = await callAI(
      `Buat storyboard video pendek (5 scene, masing-masing 1 kalimat) untuk masak ${data.recipeName}. Bahasa Indonesia.`,
      "Kamu food video director.",
      context.userId,
      context.supabase,
    );
    return { script };
  });

export const coachInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string(), z.string().max(500)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const summary = await callAI(
      `Berdasarkan jawaban onboarding: ${JSON.stringify(data.answers)}. Buat ringkasan profil & 3 rekomendasi awal. Bahasa Indonesia.`,
      "Kamu coach holistik.",
      context.userId,
      context.supabase,
    );
    return { summary };
  });

// ===== from scanExtras2 (setAuditOptIn) =====

export const setAuditOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ scan_audit_opt_in: data.enabled })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
