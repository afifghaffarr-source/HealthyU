/**
 * Admin articles management server function.
 * Lists, searches, and toggles publish state for articles.
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

export type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  is_published: boolean;
  reading_time_minutes: number | null;
  view_count: number | null;
  bookmark_count: number | null;
  image_url: string | null;
  created_at: string;
};

export type ArticleListResult = {
  items: ArticleListItem[];
  total: number;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const listArticlesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ListInputSchema, i))
  .handler(async ({ data, context }): Promise<ArticleListResult> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    let q = supabaseAdmin
      .from("articles")
      .select(
        "id, title, slug, excerpt, category, author_name, is_published, reading_time_minutes, view_count, bookmark_count, image_url, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      q = q.or(`title.ilike.%${s}%,slug.ilike.%${s}%,excerpt.ilike.%${s}%`);
    }
    if (data.category && data.category.trim()) {
      q = q.eq("category", data.category.trim());
    }

    const { data: rows, count } = await q;
    if (!rows) return { items: [], total: 0 };

    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        category: r.category,
        author_name: r.author_name,
        is_published: r.is_published ?? false,
        reading_time_minutes: r.reading_time_minutes,
        view_count: r.view_count ?? 0,
        bookmark_count: r.bookmark_count ?? 0,
        image_url: r.image_url,
        created_at: r.created_at,
      })),
      total: count ?? 0,
    };
  });

export const toggleArticlePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(TogglePublishSchema, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const { error } = await supabaseAdmin
      .from("articles")
      .update({ is_published: data.isPublished })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
