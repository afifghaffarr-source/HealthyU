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
    const { data: row } = await supabaseAdmin
      .from("recipes")
      .select("slug")
      .eq("id", data.id)
      .eq("is_published", true)
      .maybeSingle();
    return { slug: row?.slug ?? null };
  });
