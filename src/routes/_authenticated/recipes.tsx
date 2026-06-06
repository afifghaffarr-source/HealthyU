import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/features/recipes/lib/recipes.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Search, Sparkles, Bookmark } from "lucide-react";
import { AiRecipeModal } from "@/features/recipes/components/AiRecipeModal";
import { RecipeListItem } from "@/features/recipes/components/RecipeListItem";
import { TrendingStrip } from "@/features/recipes/components/TrendingStrip";
import {
  RecipeFilters,
  type RecipeCatId,
  type RecipeSortMode,
} from "@/features/recipes/components/RecipeFilters";
import { useTrendingPulse } from "@/features/recipes/hooks/useTrendingPulse";

export const Route = createFileRoute("/_authenticated/recipes")({
  component: RecipesPage,
});

function RecipesPage() {
  const fetchList = useServerFn(listRecipes);
  const qc = useQueryClient();
  const { pulling, refreshing } = usePullToRefresh(async () => {
    await qc.invalidateQueries({ queryKey: ["recipes"] });
  });
  const { data: all = [] } = useQuery({ queryKey: ["recipes"], queryFn: () => fetchList() });
  const [cat, setCat] = useState<RecipeCatId>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<RecipeSortMode>(() => {
    if (typeof window === "undefined") return "title";
    const v = window.localStorage.getItem("recipes:sort");
    return v === "rating" || v === "popular" || v === "trending" || v === "title" ? v : "title";
  });
  const [trendingOnly, setTrendingOnly] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("recipes:trendingOnly") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("recipes:sort", sort);
  }, [sort]);
  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("recipes:trendingOnly", trendingOnly ? "1" : "0");
  }, [trendingOnly]);
  const { trendingCount, pulseTrending, pulseCounter, flashIds, resetCounter } = useTrendingPulse(
    all,
    sort,
  );

  const [aiOpen, setAiOpen] = useState(false);
  const items = all
    .filter((r) => cat === "all" || r.category === cat)
    .filter((r) => (sort === "trending" && trendingOnly ? Number(r.weekly_growth ?? 0) > 0 : true))
    .filter((r) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return r.title.toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s);
    })
    .slice()
    .sort((a, b) => {
      if (sort === "rating") return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
      if (sort === "popular") return Number(b.bookmark_count ?? 0) - Number(a.bookmark_count ?? 0);
      if (sort === "trending") return Number(b.weekly_growth ?? 0) - Number(a.weekly_growth ?? 0);
      return a.title.localeCompare(b.title);
    });

  // Popularity badge: top 10% by bookmark_count (min 1 bookmark)
  const popularThreshold = (() => {
    const counts = all
      .map((r) => Number(r.bookmark_count ?? 0))
      .filter((n) => n > 0)
      .sort((a, b) => b - a);
    if (counts.length === 0) return Infinity;
    const idx = Math.max(0, Math.floor(counts.length * 0.1) - 1);
    return Math.max(1, counts[idx]);
  })();

  // Trending: top 5 by weekly_growth, only when sort==title and cat==all and no search
  const showTrending = sort === "title" && cat === "all" && !q.trim();
  const trending = showTrending
    ? all
        .filter((r) => Number(r.weekly_growth ?? 0) > 0)
        .sort((a, b) => Number(b.weekly_growth ?? 0) - Number(a.weekly_growth ?? 0))
        .slice(0, 5)
    : [];

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Resep Sehat"
          subtitle="Pilihan menu Indonesia"
          showBack
          action={
            <Link
              to="/recipes/saved"
              className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
              aria-label="Resep tersimpan"
            >
              <Bookmark className="size-4" />
            </Link>
          }
        />

        <div className="relative">
          <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari resep (gado-gado, ayam bakar...)"
            className="w-full bg-card rounded-2xl outline-1 outline-black/10 py-3 pl-11 pr-4 text-sm"
          />
        </div>

        <button
          onClick={() => setAiOpen(true)}
          className="w-full bg-gradient-to-r from-primary to-coral text-primary-foreground rounded-2xl p-4 flex items-center gap-3 text-left shadow-md"
        >
          <Sparkles className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Buat resep dengan AI</p>
            <p className="text-[11px] opacity-90">Masukkan bahan di kulkasmu</p>
          </div>
        </button>

        <RecipeFilters
          cat={cat}
          setCat={setCat}
          sort={sort}
          setSort={setSort}
          trendingOnly={trendingOnly}
          setTrendingOnly={setTrendingOnly}
          trendingCount={trendingCount}
          pulseCounter={pulseCounter}
          pulseTrending={pulseTrending}
          onTrendingClick={() => {
            setSort(sort === "trending" ? "title" : "trending");
            resetCounter();
          }}
        />

        <section className="space-y-3">
          <TrendingStrip items={trending} />
          {items.map((r) => (
            <RecipeListItem
              key={r.id}
              r={r}
              popularThreshold={popularThreshold}
              flashDelta={flashIds[r.id]}
            />
          ))}
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Tidak ada resep</p>
          )}
        </section>
      </div>

      {aiOpen && <AiRecipeModal onClose={() => setAiOpen(false)} />}

      <BottomNav />
    </main>
  );
}
