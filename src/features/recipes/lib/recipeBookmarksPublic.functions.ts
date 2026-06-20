import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public-page variant of `isRecipeBookmarked` (from recipeBookmarks.functions.ts).
 * This version accepts `slug` (used by /resep/$slug) and an optional `userId`.
 * - If `userId` is null → returns `{ authenticated: false, bookmarked: false }`
 * - If `userId` is set → looks up recipes.id by slug, then checks bookmark
 *
 * Why a new function: `/resep/$slug` is a public route. The original
 * `isRecipeBookmarked` uses `requireSupabaseAuth` middleware which throws 401
 * for anon users. This version degrades gracefully for anon (returns
 * `authenticated: false` so the UI can show a "Login to save" CTA).
 */
const InputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  userId: z.string().uuid().nullable(),
});

export const getBookmarkStateForSlug = createServerFn({ method: "GET" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    if (!data.userId) {
      return { authenticated: false, bookmarked: false, recipesId: null as string | null };
    }

    // 1. Find recipes.id by slug
    const { data: linkRow } = await supabaseAdmin
      .from("recipes")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!linkRow?.id) {
      return { authenticated: true, bookmarked: false, recipesId: null };
    }

    // 2. Check bookmark
    const { data: bm } = await supabaseAdmin
      .from("recipe_bookmarks")
      .select("id")
      .eq("user_id", data.userId)
      .eq("recipe_id", linkRow.id)
      .maybeSingle();

    return { authenticated: true, bookmarked: !!bm, recipesId: linkRow.id };
  });
