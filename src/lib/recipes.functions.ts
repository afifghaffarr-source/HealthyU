import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, description, category, calories, protein_g, carbs_g, fat_g, prep_min, servings, avg_rating, rating_count, image_url")
      .order("title");
    if (error) throw new Error(error.message);
    const recipes = data ?? [];
    if (recipes.length === 0) return [];
    const ids = recipes.map((r) => r.id);
    const { data: bms } = await supabase
      .from("recipe_bookmarks")
      .select("recipe_id")
      .in("recipe_id", ids);
    const counts = new Map<string, number>();
    (bms ?? []).forEach((b) => counts.set(b.recipe_id, (counts.get(b.recipe_id) ?? 0) + 1));
    return recipes.map((r) => ({ ...r, bookmark_count: counts.get(r.id) ?? 0 }));
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