import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRecipeRating = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [agg, mine] = await Promise.all([
      supabase.from("recipe_ratings").select("rating").eq("recipe_id", data.recipe_id),
      supabase
        .from("recipe_ratings")
        .select("rating, review")
        .eq("recipe_id", data.recipe_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const ratings = (agg.data ?? []).map((r) => r.rating as number);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      count: ratings.length,
      avg: Math.round(avg * 10) / 10,
      myRating: mine.data?.rating ?? null,
      myReview: mine.data?.review ?? null,
    };
  });

const RateSchema = z.object({
  recipe_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
});

export const rateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("recipe_ratings").upsert(
      {
        user_id: userId,
        recipe_id: data.recipe_id,
        rating: data.rating,
        review: data.review ?? null,
      },
      { onConflict: "recipe_id,user_id" },
    );
    if (error) throw new Error(error.message);

    // recompute avg + count for recipe
    const { data: all } = await supabase
      .from("recipe_ratings")
      .select("rating")
      .eq("recipe_id", data.recipe_id);
    const ratings = (all ?? []).map((r) => r.rating as number);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    await supabase
      .from("recipes")
      .update({
        avg_rating: Math.round(avg * 10) / 10,
        rating_count: ratings.length,
      })
      .eq("id", data.recipe_id);
    return { ok: true, avg, count: ratings.length };
  });
