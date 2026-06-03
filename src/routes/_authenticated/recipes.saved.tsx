import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipeBookmarks } from "@/lib/recipeBookmarks.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Bookmark, Clock, Flame, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes/saved")({
  component: SavedRecipesPage,
});

function SavedRecipesPage() {
  const fetch = useServerFn(listRecipeBookmarks);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recipe-bookmarks"],
    queryFn: () => fetch(),
  });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/recipes" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bookmark className="size-5 text-primary" /> Resep Tersimpan
            </h1>
            <p className="text-xs text-muted-foreground">{items.length} resep favorit</p>
          </div>
        </header>

        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">Memuat…</p>}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Bookmark className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Belum ada resep disimpan.</p>
            <Link to="/recipes" className="inline-block text-xs font-semibold text-primary">
              Jelajahi resep →
            </Link>
          </div>
        )}

        <section className="space-y-3">
          {items.map((r) => (
            <Link
              key={r.id}
              to="/recipes/$id"
              params={{ id: r.id }}
              className="block bg-card p-4 rounded-2xl outline-1 outline-black/5"
            >
              <h3 className="font-bold">{r.title}</h3>
              {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Flame className="size-3" />{r.calories} kcal</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" />{r.prep_min} min</span>
                {Number(r.rating_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    {Number(r.avg_rating ?? 0).toFixed(1)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}