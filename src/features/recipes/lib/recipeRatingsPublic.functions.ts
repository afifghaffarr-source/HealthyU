import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public-page variant of `getRecipeRating` (from recipeRatings.functions.ts).
 * Accepts `slug` (used by /resep/$slug) and optional `userId`. Returns null for
 * anon users, and for authed users returns aggregate stats + the user's own
 * rating/review if any.
 *
 * Why: the public /resep/$slug page wants to show "★ 4.5 (23 reviews)" without
 * forcing login. Existing `getRecipeRating` requires auth.
 */
const InputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  userId: z.string().uuid().nullable(),
});

export const getRatingStateForSlug = createServerFn({ method: "GET" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    if (!data.userId) {
      // Anon: only return aggregate (no user-specific fields)
      const linkRow = await supabaseAdmin
        .from("recipes")
        .select("id")
        .eq("slug", data.slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!linkRow.data?.id) {
        return {
          authenticated: false,
          count: 0,
          avg: 0,
          myRating: null,
          myReview: null,
          recipesId: null,
        };
      }
      const { data: ratings } = await supabaseAdmin
        .from("recipe_ratings")
        .select("rating")
        .eq("recipe_id", linkRow.data.id);
      const rs = (ratings ?? []).map((r) => r.rating as number);
      const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
      return {
        authenticated: false,
        count: rs.length,
        avg: Math.round(avg * 10) / 10,
        myRating: null,
        myReview: null,
        recipesId: linkRow.data.id,
      };
    }

    // Authed: full payload
    const { data: linkRow } = await supabaseAdmin
      .from("recipes")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!linkRow?.id) {
      return {
        authenticated: true,
        count: 0,
        avg: 0,
        myRating: null,
        myReview: null,
        recipesId: null,
      };
    }

    const [agg, mine] = await Promise.all([
      supabaseAdmin.from("recipe_ratings").select("rating").eq("recipe_id", linkRow.id),
      supabaseAdmin
        .from("recipe_ratings")
        .select("rating, review")
        .eq("recipe_id", linkRow.id)
        .eq("user_id", data.userId)
        .maybeSingle(),
    ]);

    const rs = (agg.data ?? []).map((r) => r.rating as number);
    const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;

    return {
      authenticated: true,
      count: rs.length,
      avg: Math.round(avg * 10) / 10,
      myRating: mine.data?.rating ?? null,
      myReview: mine.data?.review ?? null,
      recipesId: linkRow.id,
    };
  });
