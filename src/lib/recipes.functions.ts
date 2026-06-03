import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, description, category, calories, protein_g, carbs_g, fat_g, prep_min, servings, avg_rating, rating_count, image_url, save_count")
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, bookmark_count: r.save_count ?? 0 }));
  });

export const getRecipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return recipe;
  });