import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Clock, Flame, Star } from "lucide-react";
import { listRecipeBookmarks } from "@/features/recipes/lib/recipeBookmarks.functions";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/resep/tersimpan")({
  // Server-side auth gate. Anon users go straight to /auth (no flash of
  // empty state). `supabase.auth.getUser()` works on the server because we
  // configured it with `persistSession` + the publishable key, and the
  // client falls back to a fresh anonymous client when no session cookie
  // is present.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) {
      throw redirect({ to: "/auth" });
    }
  },
  component: SavedRecipesPage,
});

/**
 * Public marketing-style "Resep Tersimpan" page (auth-required).
 * Mirrors the layout of the old /recipes/saved but uses /resep/$slug links.
 * Anon users are redirected to /auth with a "please login" message.
 */
function SavedRecipesPage() {
  const fetch = useServerFn(listRecipeBookmarks);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recipe-bookmarks"],
    queryFn: () => fetch(),
  });

  return (
    <main className="min-h-dvh bg-background pb-24">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Resep Tersimpan" subtitle="Bookmark lo" showBack />

        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">Memuat…</p>}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Bookmark className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Belum ada resep disimpan.</p>
            <Link to="/resep" className="inline-block text-xs font-semibold text-primary">
              Jelajahi resep →
            </Link>
          </div>
        )}

        <section className="space-y-3">
          {items.map((r) =>
            r.slug ? (
              <Link
                key={r.id}
                to="/resep/$slug"
                params={{ slug: r.slug }}
                className="block bg-card p-4 rounded-2xl outline-1 outline-black/5 hover:bg-accent transition"
              >
                <h3 className="font-bold">{r.title}</h3>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                )}
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="size-3" />
                    {r.calories} kcal
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {r.prep_min} min
                  </span>
                  {Number(r.rating_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      {Number(r.avg_rating ?? 0).toFixed(1)}
                    </span>
                  )}
                </div>
              </Link>
            ) : null,
          )}
        </section>
      </div>
    </main>
  );
}
