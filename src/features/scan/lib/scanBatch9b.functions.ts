import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Hydration challenge ----------
export const createHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        groupId: z.string().uuid(),
        targetMl: z.number().int().min(500).max(20000),
        startDate: z.string(),
        endDate: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("hydration_challenges")
      .insert({
        group_id: data.groupId,
        creator_id: userId,
        target_ml: data.targetMl,
        start_date: data.startDate,
        end_date: data.endDate,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("hydration_challenge_members")
      .insert({ challenge_id: row.id, user_id: userId });
    return { challenge: row };
  });

export const joinHydrationChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hydration_challenge_members")
      .insert({ challenge_id: data.challengeId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Smart alarm ----------
export const upsertSmartAlarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
        windowMin: z.number().int().min(5).max(60).default(30),
        enabled: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      wake_time: data.wakeTime,
      window_min: data.windowMin,
      enabled: data.enabled,
    };
    const q = data.id
      ? supabase.from("smart_alarms").update(payload).eq("id", data.id).eq("user_id", userId)
      : supabase.from("smart_alarms").insert(payload);
    const { data: row, error } = await q.select().single();
    if (error) throw new Error(error.message);
    return { alarm: row };
  });

export const listSmartAlarms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("smart_alarms")
      .select("*")
      .eq("user_id", context.userId)
      .order("wake_time");
    if (error) throw new Error(error.message);
    return { alarms: data ?? [] };
  });

// ---------- Barcode scan (Open Food Facts) ----------
export const scanBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ barcode: z.string().min(6).max(20).regex(/^\d+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cached } = await supabase
      .from("barcode_cache")
      .select("*")
      .eq("barcode", data.barcode)
      .maybeSingle();
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
      allergens:
        (p.allergens_tags as string[] | undefined)?.map((a) => a.replace(/^en:/, "")) ?? null,
      raw: JSON.parse(JSON.stringify(p)) as never,
    };
    await supabase.from("barcode_cache").insert(product as never);
    const { raw: _omit, ...safe } = product;
    void _omit;
    return {
      product: { ...safe, created_at: new Date().toISOString(), raw: null as never },
      cached: false,
    };
  });

// ---------- Story photo upload metadata ----------
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
