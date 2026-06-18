/**
 * Admin recipes management server function.
 * Lists, searches, updates publish state, deletes, and triggers image regen.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const ListInputSchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const TogglePublishSchema = z.object({
  id: z.string().uuid(),
  isPublished: z.boolean(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

export type RecipeListItem = {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  cuisine: string | null;
  calories: number | null;
  prep_min: number | null;
  is_published: boolean;
  is_featured: boolean;
  image_url: string | null;
  has_image_file: boolean;
  created_at: string;
  updated_at: string | null;
  avg_rating: number | null;
  rating_count: number | null;
  save_count: number | null;
};

export type RecipeListResult = {
  items: RecipeListItem[];
  total: number;
  hasMore: boolean;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const listRecipesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ListInputSchema, i))
  .handler(async ({ data, context }): Promise<RecipeListResult> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    let q = supabaseAdmin
      .from("recipes")
      .select(
        "id, title, slug, category, cuisine, calories, prep_min, is_published, is_featured, image_url, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      q = q.or(`title.ilike.%${s}%,slug.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (data.category && data.category.trim()) {
      q = q.eq("category", data.category.trim());
    }

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const items: RecipeListItem[] = (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      category: r.category,
      cuisine: r.cuisine,
      calories: r.calories,
      prep_min: r.prep_min,
      is_published: r.is_published ?? false,
      is_featured: r.is_featured ?? false,
      image_url: r.image_url,
      has_image_file: !!r.image_url && r.image_url.startsWith("/images/recipes/"),
      created_at: r.created_at,
      updated_at: r.updated_at,
      avg_rating: null,
      rating_count: null,
      save_count: null,
    }));

    return {
      items,
      total: count ?? items.length,
      hasMore: data.offset + items.length < (count ?? items.length),
    };
  });

export const toggleRecipePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(TogglePublishSchema, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ is_published: data.isPublished, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Also sync to seo_recipes.published
    const { data: rec } = await supabaseAdmin
      .from("recipes")
      .select("slug")
      .eq("id", data.id)
      .single();
    if (rec?.slug) {
      await supabaseAdmin
        .from("seo_recipes")
        .update({
          published: data.isPublished,
          published_at: data.isPublished ? new Date().toISOString() : null,
        })
        .eq("slug", rec.slug);
    }

    return { ok: true };
  });

export const deleteRecipeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(DeleteSchema, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const { data: rec } = await supabaseAdmin
      .from("recipes")
      .select("slug")
      .eq("id", data.id)
      .single();
    if (!rec) throw new Error("recipe not found");

    // Delete from seo_recipes first (if exists). Skip if slug is null.
    if (rec.slug) {
      await supabaseAdmin.from("seo_recipes").delete().eq("slug", rec.slug);
    }
    // Then from recipes
    const { error } = await supabaseAdmin.from("recipes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true, deletedSlug: rec.slug ?? "(no slug)" };
  });
