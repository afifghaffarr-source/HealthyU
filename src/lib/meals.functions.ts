import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayRange } from "./health";

export const searchFoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(80).default("") }).parse(input),
  )
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
    return { ok: true };
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("meal_logs").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
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