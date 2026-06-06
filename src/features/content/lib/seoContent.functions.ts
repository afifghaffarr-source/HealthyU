import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("seo_recipes")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSeoFaqs = createServerFn({ method: "GET" }).handler(async () => {
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
