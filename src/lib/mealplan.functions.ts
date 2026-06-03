import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlanSchema = z.object({
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  food_item_id: z.string().uuid().nullable(),
  custom_name: z.string().max(100).nullable(),
  calories: z.number().min(0).max(5000),
  planned_qty: z.number().min(0.1).max(20).default(1),
});

export const weekPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const start = new Date(data.start_date + "T00:00:00Z");
    const end = new Date(start.getTime() + 7 * 86400000);
    const endStr = end.toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from("meal_plans")
      .select("*, food_item:food_items(name)")
      .eq("user_id", userId)
      .gte("plan_date", data.start_date)
      .lt("plan_date", endStr)
      .order("plan_date", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meal_plans")
      .insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meal_plans")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });