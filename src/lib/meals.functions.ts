import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayRange } from "./health";
import { recordActivityFor } from "@/features/gamification/lib/gamification.functions";

export const searchFoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().max(80).default("") }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase.from("food_items").select("*").limit(30);
    if (data.q.trim()) {
      query = query.or(`name.ilike.%${data.q}%,name_en.ilike.%${data.q}%`);
    }
    const { data: foods, error } = await query;
    if (error) throw new Error(error.message);
    return foods ?? [];
  });

const LogSchema = z.object({
  food_item_id: z.string().uuid().nullable(),
  custom_name: z.string().max(100).nullable(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  serving_qty: z.number().min(0.1).max(20),
  calories: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500).default(0),
  carbs_g: z.number().min(0).max(1000).default(0),
  fat_g: z.number().min(0).max(500).default(0),
});

export const logMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LogSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("meal_logs").insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    const game = await recordActivityFor(supabase, userId, "meal_logged");
    return { ok: true, game };
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ItemSchema = z.object({
  food_item_id: z.string().uuid().nullable(),
  food_name: z.string().min(1).max(120),
  serving_qty: z.number().min(0.1).max(20).default(1),
  serving_unit: z.string().max(20).nullable().optional(),
  calories: z.number().min(0).max(5000),
  protein_g: z.number().min(0).max(500).default(0),
  carbs_g: z.number().min(0).max(1000).default(0),
  fat_g: z.number().min(0).max(500).default(0),
});

const LogMultiSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  notes: z.string().max(500).optional(),
  items: z.array(ItemSchema).min(1).max(20),
});

export const logMealWithItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LogMultiSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const totals = data.items.reduce(
      (acc, it) => ({
        calories: acc.calories + it.calories * it.serving_qty,
        protein_g: acc.protein_g + it.protein_g * it.serving_qty,
        carbs_g: acc.carbs_g + it.carbs_g * it.serving_qty,
        fat_g: acc.fat_g + it.fat_g * it.serving_qty,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const { data: parent, error } = await supabase
      .from("meal_logs")
      .insert({
        user_id: userId,
        meal_type: data.meal_type,
        serving_qty: 1,
        calories: Math.round(totals.calories),
        protein_g: Math.round(totals.protein_g * 10) / 10,
        carbs_g: Math.round(totals.carbs_g * 10) / 10,
        fat_g: Math.round(totals.fat_g * 10) / 10,
        custom_name: data.items
          .map((i) => i.food_name)
          .join(", ")
          .slice(0, 100),
        notes: data.notes ?? null,
        source: "multi",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const itemsPayload = data.items.map((it) => ({
      meal_log_id: parent.id,
      food_item_id: it.food_item_id,
      food_name: it.food_name,
      serving_qty: it.serving_qty,
      serving_unit: it.serving_unit ?? null,
      calories: it.calories * it.serving_qty,
      protein_g: it.protein_g * it.serving_qty,
      carbs_g: it.carbs_g * it.serving_qty,
      fat_g: it.fat_g * it.serving_qty,
    }));
    const { error: itemsErr } = await supabase.from("meal_log_items").insert(itemsPayload);
    if (itemsErr) throw new Error(itemsErr.message);
    const game = await recordActivityFor(supabase, userId, "meal_logged");
    return { ok: true, id: parent.id, game };
  });

export const todaysMeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { start, end } = todayRange();
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*, food_item:food_items(name, serving_unit)")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end)
      .order("logged_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
