import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRecipeBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bms, error } = await supabase
      .from("recipe_bookmarks")
      .select("recipe_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (bms ?? []).map((b) => b.recipe_id);
    if (ids.length === 0) return [];
    const { data: recipes } = await supabase
      .from("recipes")
      .select(
        "id, slug, title, description, category, calories, prep_min, avg_rating, rating_count, image_url",
      )
      .in("id", ids);
    const map = new Map((recipes ?? []).map((r) => [r.id, r]));
    return (bms ?? [])
      .map((b) => {
        const r = map.get(b.recipe_id);
        return r ? { ...r, bookmarked_at: b.created_at } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

export const isRecipeBookmarked = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("recipe_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("recipe_id", data.recipe_id)
      .maybeSingle();
    return { bookmarked: !!row };
  });

export const toggleRecipeBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("recipe_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("recipe_id", data.recipe_id)
      .maybeSingle();
    if (row) {
      const { error } = await supabase.from("recipe_bookmarks").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      return { bookmarked: false };
    }
    const { error } = await supabase
      .from("recipe_bookmarks")
      .insert({ user_id: userId, recipe_id: data.recipe_id });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  });
