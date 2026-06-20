import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEnvVar } from "@/lib/cloudflare-env.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// LIGHTHOUSE-001 fallback: when Supabase env is not configured OR uses the
// CI placeholder values (lhci with placeholder URLs, no real DB), return
// empty data with HTTP 200 so route loaders don't 500 → lhci fails.
// Production env is always set with real values in CF Workers, so this
// branch is unreachable there. Real DB errors (env set, query fails) still
// surface via the throw in the handlers.
function supabaseConfigured(): boolean {
  const url = getEnvVar("SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  // Detect CI placeholder values (e.g. "https://placeholder.supabase.co"
  // + "sb_secret_placeholder"). Real Supabase URLs are https://*.supabase.co
  // with real project IDs, not "placeholder".
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  return true;
}

const slugSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
});

export const listFoods = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_foods")
    .select("slug,name,category,calories,protein_g,carbs_g,fat_g,serving_size")
    .eq("published", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getFood = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_foods")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listExercises = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_exercises")
    .select("slug,name,category,met,difficulty")
    .eq("published", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getExercise = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_exercises")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDiets = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_diet_guides")
    .select("slug,name,short_description,tags")
    .eq("published", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getDiet = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_diet_guides")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSeoArticles = createServerFn({ method: "GET" }).handler(async () => {
  if (!supabaseConfigured()) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_articles")
    .select("slug,title,excerpt,category,tags,image_url,reading_time_minutes,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSeoArticle = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_articles")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSeoRecipes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_recipes")
    .select("slug,title,description,category,image_url,calories,protein_g,total_min,servings,tags")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSeoRecipe = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("seo_recipes")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    // Look up the corresponding recipes.id (used by recipe_bookmarks, recipe_ratings, etc.)
    // seo_recipes and recipes share the same slug. All 25 published seo_recipes have a
    // matching recipes row, so this is a safe join. If a future drift appears, the page
    // degrades gracefully (bookmark disabled, no error).
    const { data: linkRow } = await supabaseAdmin
      .from("recipes")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    return { ...row, recipesId: linkRow?.id ?? null };
  });

export const listSeoFaqs = createServerFn({ method: "GET" }).handler(async () => {
  if (!supabaseConfigured()) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seo_faqs")
    .select("slug,title,description,category,published_at")
    .eq("published", true)
    .order("title");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSeoFaq = createServerFn({ method: "GET" })
  .inputValidator((d) => slugSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_faqs")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
