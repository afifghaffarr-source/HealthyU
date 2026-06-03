import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [arts, marks] = await Promise.all([
      supabase
        .from("articles")
        .select(
          "id,title,excerpt,image_url,category,reading_time_minutes,author_name,published_at,is_featured",
        )
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(50),
      supabase.from("article_bookmarks").select("article_id").eq("user_id", userId),
    ]);
    return {
      articles: arts.data ?? [],
      bookmarks: (marks.data ?? []).map((b) => b.article_id as string),
    };
  });

const ToggleSchema = z.object({ article_id: z.string().uuid() });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("article_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("article_id", data.article_id)
      .maybeSingle();
    if (existing) {
      await supabase.from("article_bookmarks").delete().eq("id", existing.id);
      return { bookmarked: false };
    }
    await supabase
      .from("article_bookmarks")
      .insert({ user_id: userId, article_id: data.article_id });
    return { bookmarked: true };
  });