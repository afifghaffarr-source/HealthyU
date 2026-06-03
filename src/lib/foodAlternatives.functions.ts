import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFoodAlternatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ food_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("food_alternatives")
      .select("id, similarity_score, reason, alternative_food_id")
      .eq("food_id", data.food_id)
      .order("similarity_score", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.alternative_food_id);
    if (ids.length === 0) return [];
    const { data: foods } = await supabase
      .from("food_items")
      .select("id, name, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg, fiber_g, health_rating, serving_size, serving_unit")
      .in("id", ids);
    const fmap = new Map((foods ?? []).map((f) => [f.id, f]));
    return (rows ?? [])
      .map((r) => {
        const f = fmap.get(r.alternative_food_id);
        if (!f) return null;
        return {
          ...f,
          similarity_score: r.similarity_score,
          reason: r.reason,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });