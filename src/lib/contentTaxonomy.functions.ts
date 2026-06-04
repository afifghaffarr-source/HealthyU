import { createServerFn } from "@tanstack/react-start";
import { supabase as publicClient } from "@/integrations/supabase/client";

/** Public read — no auth needed. Cached on the client. */
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient
    .from("content_categories")
    .select("slug, name_id, name_en, description, parent_slug, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name_id", { ascending: true });
  if (error) throw new Error(error.message);
  return { categories: data ?? [] };
});

export const listTopTags = createServerFn({ method: "GET" })
  .inputValidator((i: { limit?: number } | undefined) => ({ limit: i?.limit ?? 50 }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient
      .from("content_tags")
      .select("slug, name_id, name_en, usage_count")
      .eq("is_active", true)
      .order("usage_count", { ascending: false })
      .limit(Math.min(data.limit, 200));
    if (error) throw new Error(error.message);
    return { tags: rows ?? [] };
  });