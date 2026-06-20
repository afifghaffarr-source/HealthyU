import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public-page variant of `listRecipeReviews` (from scanGamification2.functions.ts).
 * Accepts `slug` and returns reviews for the underlying recipes.id row.
 *
 * Why: the original uses POST method (odd for a read) and requires recipeId.
 * The public /resep/$slug page wants a GET-style read by slug for SEO/SSR
 * friendliness and to avoid depending on internal UUIDs.
 */
const InputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  limit: z.number().int().min(1).max(50).optional(),
});

export type PublicReview = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

export const listReviewsForSlug = createServerFn({ method: "GET" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<PublicReview[]> => {
    const limit = data.limit ?? 5;

    const { data: linkRow } = await supabaseAdmin
      .from("recipes")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!linkRow?.id) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("recipe_reviews")
      .select("id, rating, review, created_at")
      .eq("recipe_id", linkRow.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as PublicReview[];
  });
