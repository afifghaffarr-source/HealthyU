import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Look up the published slug for a given recipes.id UUID.
 * Returns null if the recipe doesn't exist or is not published.
 *
 * Used by the deprecation redirect in /_authenticated/recipes/$ so that
 * /recipes/<uuid> → /resep/<slug> instead of just /resep.
 */
export const getSlugFromRecipeId = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    // Look up the recipes.id → slug. We also confirm the slug is published in
    // seo_recipes (the public marketing table that /resep/$slug reads from).
    // This prevents redirecting to /resep/<slug> for recipes that exist in
    // the `recipes` table but haven't been promoted to seo_recipes yet.
    const { data: row } = await supabaseAdmin
      .from("recipes")
      .select("slug")
      .eq("id", data.id)
      .eq("is_published", true)
      .maybeSingle();
    const slug = row?.slug;
    if (!slug) return { slug: null };

    const { data: seoRow } = await supabaseAdmin
      .from("seo_recipes")
      .select("slug")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    return { slug: seoRow?.slug ?? null };
  });
