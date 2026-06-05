import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/integrations/supabase/auth-middleware";

export const browseFoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().max(80).default(""),
        region: z.string().max(50).optional(),
        category: z.string().max(50).optional(),
        tag: z.string().max(50).optional(),
        excludeAllergens: z.array(z.string().max(50)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("food_items")
      .select(
        "id,name,name_en,category,subcategory,region,calories,protein_g,carbs_g,fat_g,fiber_g,serving_size,serving_unit,allergens,tags,popularity_score",
      )
      .order("popularity_score", { ascending: false })
      .limit(60);

    if (data.q.trim()) query = query.or(`name.ilike.%${data.q}%,name_en.ilike.%${data.q}%`);
    if (data.region) query = query.eq("region", data.region);
    if (data.category) query = query.eq("category", data.category);
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.excludeAllergens.length) {
      // overlaps = has any of these allergens; we want rows that DO NOT overlap
      query = query.not("allergens", "ov", `{${data.excludeAllergens.join(",")}}`);
    }
    const { data: foods, error } = await query;
    if (error) throw new Error(error.message);
    return foods ?? [];
  });

export const getFoodDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: food, error: fe }, { data: servings, error: se }] = await Promise.all([
      supabase.from("food_items").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("food_serving_sizes")
        .select("id,label,grams,is_default")
        .eq("food_item_id", data.id)
        .order("is_default", { ascending: false }),
    ]);
    if (fe) throw new Error(fe.message);
    if (se) throw new Error(se.message);
    return { food, servings: servings ?? [] };
  });

export const getFoodFacets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("food_items")
      .select("region,category,tags,allergens")
      .gt("popularity_score", 0);
    if (error) throw new Error(error.message);
    const regions = new Set<string>();
    const categories = new Set<string>();
    const tags = new Set<string>();
    const allergens = new Set<string>();
    (data ?? []).forEach((r) => {
      if (r.region) regions.add(r.region);
      if (r.category) categories.add(r.category);
      (r.tags ?? []).forEach((t: string) => tags.add(t));
      (r.allergens ?? []).forEach((a: string) => allergens.add(a));
    });
    return {
      regions: [...regions].sort(),
      categories: [...categories].sort(),
      tags: [...tags].sort(),
      allergens: [...allergens].sort(),
    };
  });
