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

const GetSchema = z.object({ id: z.string().uuid() });

export const getArticle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GetSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: article }, { data: mark }] = await Promise.all([
      supabase
        .from("articles")
        .select(
          "id,title,excerpt,content,content_html,image_url,category,reading_time_minutes,author_name,author_title,author_avatar_url,published_at,tags",
        )
        .eq("id", data.id)
        .eq("is_published", true)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("article_bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("article_id", data.id)
        .maybeSingle(),
    ]);

    let related: Array<{
      id: string;
      title: string;
      image_url: string | null;
      reading_time_minutes: number | null;
    }> = [];
    if (article?.category) {
      const { data: rel } = await supabase
        .from("articles")
        .select("id,title,image_url,reading_time_minutes")
        .eq("category", article.category)
        .eq("is_published", true)
        .is("deleted_at", null)
        .neq("id", article.id)
        .order("published_at", { ascending: false })
        .limit(4);
      related = rel ?? [];
    }

    return { article, bookmarked: !!mark, related };
  });
