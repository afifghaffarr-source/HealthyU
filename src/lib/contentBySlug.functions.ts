import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateArticleBody, generateRecipeBody } from "./contentGeneration.server";

const SlugInput = z.object({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
});

export const getArticleBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SlugInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: art, error } = await supabase
      .from("articles")
      .select(
        "id, slug, title, excerpt, content, image_url, category, reading_time_minutes, author_name, published_at, body_source, meta_title, meta_description, language",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!art) return { article: null };

    let content = art.content;
    if ((!content || content.trim().length === 0) && art.body_source === "seed") {
      content = await generateArticleBody(data.slug);
    }

    // best-effort view increment (skip if RPC not present)
    return { article: { ...art, content } };
  });

export const getRecipeBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SlugInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rec, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) return { recipe: null };

    let ingredients = rec.ingredients ?? [];
    let instructions = rec.instructions ?? [];
    if ((ingredients.length === 0 || instructions.length === 0) && rec.body_source === "seed") {
      const body = await generateRecipeBody(data.slug);
      if (body) {
        ingredients = body.ingredients;
        instructions = body.instructions;
      }
    }

    return { recipe: { ...rec, ingredients, instructions } };
  });
