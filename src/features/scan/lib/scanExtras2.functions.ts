import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWeeklyNutrition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("log_date, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("log_date", since.toISOString().slice(0, 10));
    if (error) throw new Error(error.message);
    const byDay: Record<string, { cal: number; p: number; c: number; f: number }> = {};
    (data ?? []).forEach((r) => {
      const k = r.log_date as string;
      if (!byDay[k]) byDay[k] = { cal: 0, p: 0, c: 0, f: 0 };
      byDay[k].cal += Number(r.calories ?? 0);
      byDay[k].p += Number(r.protein_g ?? 0);
      byDay[k].c += Number(r.carbs_g ?? 0);
      byDay[k].f += Number(r.fat_g ?? 0);
    });
    const days = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    return { days };
  });

export const recommendRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: prof }, { data: logs }] = await Promise.all([
      supabase.from("profiles").select("daily_calorie_target").eq("id", userId).maybeSingle(),
      supabase.from("meal_logs").select("calories").eq("user_id", userId).eq("log_date", today),
    ]);
    const target = Number(prof?.daily_calorie_target ?? 2000);
    const consumed = (logs ?? []).reduce((s, r) => s + Number(r.calories ?? 0), 0);
    const remaining = Math.max(0, target - consumed);
    const max = Math.round(remaining + 100);
    const min = Math.max(0, Math.round(remaining - 200));
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, title, calories, image_url, prep_min")
      .gte("calories", min)
      .lte("calories", max)
      .limit(10);
    if (error) throw new Error(error.message);
    return { remaining, recipes: recipes ?? [] };
  });

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

export const relogMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        calories: z.number().min(0).max(5000),
        protein_g: z.number().min(0).max(500).optional(),
        carbs_g: z.number().min(0).max(1000).optional(),
        fat_g: z.number().min(0).max(500).optional(),
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        portion_g: z.number().min(0).max(5000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("meal_logs").insert({
      user_id: userId,
      custom_name: data.name,
      calories: data.calories,
      protein_g: data.protein_g ?? 0,
      carbs_g: data.carbs_g ?? 0,
      fat_g: data.fat_g ?? 0,
      meal_type: data.meal_type,
      serving_qty: 1,
      source: "quick_relog",
      log_date: new Date().toISOString().slice(0, 10),
      logged_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        barcode: z
          .string()
          .min(6)
          .max(20)
          .regex(/^[0-9]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data.barcode}.json`);
    if (!res.ok) return { found: false };
    const j = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        nutriments?: {
          "energy-kcal_100g"?: number;
          proteins_100g?: number;
          carbohydrates_100g?: number;
          fat_100g?: number;
        };
        image_front_small_url?: string;
      };
    };
    if (j.status !== 1 || !j.product) return { found: false };
    const p = j.product;
    return {
      found: true,
      name: p.product_name ?? "Produk",
      brand: p.brands ?? "",
      image: p.image_front_small_url ?? null,
      per100g: {
        calories: Number(p.nutriments?.["energy-kcal_100g"] ?? 0),
        protein: Number(p.nutriments?.proteins_100g ?? 0),
        carbs: Number(p.nutriments?.carbohydrates_100g ?? 0),
        fat: Number(p.nutriments?.fat_100g ?? 0),
      },
    };
  });
