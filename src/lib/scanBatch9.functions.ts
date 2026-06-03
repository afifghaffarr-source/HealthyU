import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Recipe reviews ----------
export const addRecipeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().uuid(), rating: z.number().int().min(1).max(5), review: z.string().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("recipe_reviews")
      .upsert({ recipe_id: data.recipeId, user_id: userId, rating: data.rating, review: data.review ?? null }, { onConflict: "recipe_id,user_id" })
      .select().single();
    if (error) throw new Error(error.message);
    return { review: row };
  });

export const listRecipeReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("recipe_reviews")
      .select("id, rating, review, created_at, user_id").eq("recipe_id", data.recipeId)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [] };
  });

// ---------- Weight goal ----------
export const setWeightGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ startWeightKg: z.number().positive(), targetWeightKg: z.number().positive(), targetDate: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("weight_goals")
      .upsert({ user_id: userId, start_weight_kg: data.startWeightKg, target_weight_kg: data.targetWeightKg, target_date: data.targetDate, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select().single();
    if (error) throw new Error(error.message);
    return { goal: row };
  });

export const getWeightGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("weight_goals").select("*").eq("user_id", context.userId).maybeSingle();
    if (!data) return { goal: null, prediction: null };
    // simple linear prediction from recent weight_logs if exists
    const { data: logs } = await context.supabase.from("weight_logs").select("weight_kg, logged_at").eq("user_id", context.userId).order("logged_at", { ascending: false }).limit(14);
    let prediction: { estDate: string | null; weeklyRate: number } | null = null;
    if (logs && logs.length >= 2) {
      const first = logs[logs.length - 1];
      const last = logs[0];
      const days = Math.max(1, (new Date(last.logged_at).getTime() - new Date(first.logged_at).getTime()) / 86400000);
      const ratePerDay = (Number(last.weight_kg) - Number(first.weight_kg)) / days;
      const weeklyRate = ratePerDay * 7;
      const remaining = Number(data.target_weight_kg) - Number(last.weight_kg);
      const estDays = ratePerDay !== 0 ? Math.round(remaining / ratePerDay) : null;
      prediction = {
        estDate: estDays && estDays > 0 ? new Date(Date.now() + estDays * 86400000).toISOString().slice(0, 10) : null,
        weeklyRate: Number(weeklyRate.toFixed(2)),
      };
    }
    return { goal: data, prediction };
  });

// ---------- Exercise library ----------
export const listExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ category: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("exercise_library").select("*").order("name");
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { exercises: rows ?? [] };
  });

// ---------- Daily login bonus ----------
export const claimDailyLoginBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("daily_login_bonuses").select("*").eq("user_id", userId).eq("bonus_date", today).maybeSingle();
    if (existing) return { bonus: existing, alreadyClaimed: true };
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data: prev } = await supabase.from("daily_login_bonuses").select("streak").eq("user_id", userId).eq("bonus_date", yesterday).maybeSingle();
    const streak = (prev?.streak ?? 0) + 1;
    const coins = Math.min(5 + (streak - 1) * 2, 50);
    const { data: row, error } = await supabase.from("daily_login_bonuses")
      .insert({ user_id: userId, bonus_date: today, coins, streak }).select().single();
    if (error) throw new Error(error.message);
    await supabase.rpc("increment_coins" as never, { p_user: userId, p_amount: coins } as never).then(() => {}, () => {});
    return { bonus: row, alreadyClaimed: false };
  });

// ---------- Hydration challenge ----------
export const createHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: z.string().uuid(), targetMl: z.number().int().min(500).max(20000), startDate: z.string(), endDate: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("hydration_challenges")
      .insert({ group_id: data.groupId, creator_id: userId, target_ml: data.targetMl, start_date: data.startDate, end_date: data.endDate })
      .select().single();
    if (error) throw new Error(error.message);
    await supabase.from("hydration_challenge_members").insert({ challenge_id: row.id, user_id: userId });
    return { challenge: row };
  });

export const joinHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hydration_challenge_members")
      .insert({ challenge_id: data.challengeId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Smart alarm ----------
export const upsertSmartAlarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), wakeTime: z.string().regex(/^\d{2}:\d{2}$/), windowMin: z.number().int().min(5).max(60).default(30), enabled: z.boolean().default(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { user_id: userId, wake_time: data.wakeTime, window_min: data.windowMin, enabled: data.enabled };
    const q = data.id ? supabase.from("smart_alarms").update(payload).eq("id", data.id).eq("user_id", userId) : supabase.from("smart_alarms").insert(payload);
    const { data: row, error } = await q.select().single();
    if (error) throw new Error(error.message);
    return { alarm: row };
  });

export const listSmartAlarms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("smart_alarms").select("*").eq("user_id", context.userId).order("wake_time");
    if (error) throw new Error(error.message);
    return { alarms: data ?? [] };
  });

// ---------- Barcode scan (Open Food Facts) ----------
export const scanBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ barcode: z.string().min(6).max(20).regex(/^\d+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cached } = await supabase.from("barcode_cache").select("*").eq("barcode", data.barcode).maybeSingle();
    if (cached) return { product: cached, cached: true };
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data.barcode}.json`);
    if (!res.ok) throw new Error("Barcode tidak ditemukan");
    const json = (await res.json()) as { product?: Record<string, unknown>; status?: number };
    if (json.status !== 1 || !json.product) throw new Error("Produk tidak ditemukan");
    const p = json.product as Record<string, unknown>;
    const n = (p.nutriments ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" ? v : v ? Number(v) : null);
    const product = {
      barcode: data.barcode,
      product_name: (p.product_name as string) ?? null,
      brand: (p.brands as string) ?? null,
      calories_per_100g: num(n["energy-kcal_100g"]),
      protein_g: num(n.proteins_100g),
      carbs_g: num(n.carbohydrates_100g),
      fat_g: num(n.fat_100g),
      allergens: (p.allergens_tags as string[] | undefined)?.map((a) => a.replace(/^en:/, "")) ?? null,
      raw: JSON.parse(JSON.stringify(p)) as never,
    };
    await supabase.from("barcode_cache").insert(product as never);
    return { product: product as unknown as Record<string, unknown>, cached: false };
  });

// ---------- Story photo upload metadata ----------
export const recordStoryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storagePath: z.string().min(1).max(500), storyId: z.string().uuid().optional(), caption: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("story_photos")
      .insert({ user_id: context.userId, storage_path: data.storagePath, story_id: data.storyId ?? null, caption: data.caption ?? null })
      .select().single();
    if (error) throw new Error(error.message);
    return { photo: row };
  });