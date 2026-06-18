/**
 * Admin overview server function.
 * Returns aggregate counts + recent activity for the admin dashboard.
 *
 * Uses supabaseAdmin (service role) since RLS may not grant SELECT on
 * aggregate counts / system tables to regular admins.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const InputSchema = z.object({}).strict();

export type AdminOverview = {
  generatedAt: string;
  users: {
    total: number;
    last24h: number;
    last7d: number;
    admins: number;
  };
  recipes: {
    total: number;
    published: number;
    withImage: number;
    last7d: number;
  };
  articles: {
    total: number;
    published: number;
  };
  recipesByCategory: Array<{ category: string; count: number }>;
  recentRecipes: Array<{
    id: string;
    title: string;
    slug: string;
    created_at: string;
    category: string | null;
  }>;
  recentUsers: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }>;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(InputSchema, i))
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error("not authenticated");
    await ensureAdmin(supabaseAdmin, userId);

    // Parallel fetch all aggregates
    const [
      recipesTotalRes,
      recipesWithImageRes,
      recipesLast7dRes,
      articlesTotalRes,
      articlesPublishedRes,
      recentRecipesRes,
      recipesByCatRes,
      usersListRes,
      adminCountRes,
    ] = await Promise.all([
      supabaseAdmin.from("recipes").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .not("image_url", "is", null)
        .neq("image_url", ""),
      supabaseAdmin
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 86400e3).toISOString()),
      supabaseAdmin.from("articles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabaseAdmin
        .from("recipes")
        .select("id, title, slug, created_at, category")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin.from("recipes").select("category"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 }),
      supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin"),
    ]);

    // Users breakdown — listUsers returns union type; handle both
    const usersData = usersListRes.data;
    const users = (usersData && "users" in usersData ? usersData.users : []) ?? [];
    const dayAgo = Date.now() - 86400e3;
    const weekAgo = Date.now() - 7 * 86400e3;
    const last24h = users.filter((u) => new Date(u.created_at).getTime() > dayAgo).length;
    const last7d = users.filter((u) => new Date(u.created_at).getTime() > weekAgo).length;

    // Recipes by category aggregation
    const catCounts = new Map<string, number>();
    for (const r of recipesByCatRes.data ?? []) {
      const cat = r.category ?? "(uncategorized)";
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    const recipesByCategory = Array.from(catCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      generatedAt: new Date().toISOString(),
      users: {
        total: (usersData && "total" in usersData ? usersData.total : undefined) ?? users.length,
        last24h,
        last7d,
        admins: adminCountRes.count ?? 0,
      },
      recipes: {
        total: recipesTotalRes.count ?? 0,
        published: recipesTotalRes.count ?? 0, // all recipes in DB are published for now
        withImage: recipesWithImageRes.count ?? 0,
        last7d: recipesLast7dRes.count ?? 0,
      },
      articles: {
        total: articlesTotalRes.count ?? 0,
        published: articlesPublishedRes.count ?? 0,
      },
      recipesByCategory,
      recentRecipes: (recentRecipesRes.data ?? [])
        .filter((r) => typeof r.slug === "string" && r.slug.length > 0)
        .map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug as string,
          created_at: r.created_at,
          category: r.category,
        })),
      recentUsers: users.slice(0, 10).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      })),
    };
  });
