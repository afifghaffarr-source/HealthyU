import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/features/recipes/lib/recipes.functions";
import {
  TRENDING_TTL_DAYS,
  TRENDING_COUNTER_PULSE_MS,
  TRENDING_GROWTH_FLASH_MS,
} from "@/lib/constants";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Search, Sparkles, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AiRecipeModal } from "@/features/recipes/components/AiRecipeModal";
import { RecipeListItem } from "@/features/recipes/components/RecipeListItem";
import { TrendingStrip } from "@/features/recipes/components/TrendingStrip";
import {
  RECIPE_CATS,
  RecipeFilters,
  type RecipeCatId,
  type RecipeSortMode,
} from "@/features/recipes/components/RecipeFilters";

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
  const [pulseTrending, setPulseTrending] = useState(false);
  const [pulseCounter, setPulseCounter] = useState(false);
  const [flashIds, setFlashIds] = useState<Record<string, number>>({});
  const prevGrowth = useRef<Record<string, number>>({});
  const prevTrendingCount = useRef<number | null>(
    typeof window === "undefined"
      ? null
      : (() => {
          const raw = window.localStorage.getItem("recipes:trendingCount");
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw) as { count: number; ts: number };
            if (
              typeof parsed?.count !== "number" ||
              typeof parsed?.ts !== "number" ||
              Date.now() - parsed.ts > TRENDING_TTL_DAYS * 86400000
            ) {
              window.localStorage.removeItem("recipes:trendingCount");
              return null;
            }
            return parsed.count;
          } catch {
            // legacy plain-number format → invalidate
            window.localStorage.removeItem("recipes:trendingCount");
            return null;
          }
        })(),
  );

  const trendingCount = all.filter((r) => Number(r.weekly_growth ?? 0) > 0).length;
  useEffect(() => {
    const prev = prevTrendingCount.current;
    prevTrendingCount.current = trendingCount;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "recipes:trendingCount",
        JSON.stringify({ count: trendingCount, ts: Date.now() }),
      );
    }
    if (prev === null) return;
    if (trendingCount > prev) {
      setPulseCounter(true);
      const t = window.setTimeout(() => setPulseCounter(false), TRENDING_COUNTER_PULSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [trendingCount]);

  // Realtime re-sort while in trending mode
  useEffect(() => {
    if (sort !== "trending") return;
    const ch = supabase
      .channel("recipes-trending-bookmarks")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_bookmarks" }, () => {
        qc.invalidateQueries({ queryKey: ["recipes"] });
        setPulseTrending(true);
        window.setTimeout(() => setPulseTrending(false), 3000);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sort, qc]);

  // Detect weekly_growth bumps to flash a +N badge
  useEffect(() => {
    const next: Record<string, number> = {};
    const bumps: Record<string, number> = {};
    for (const r of all) {
      const g = Number(r.weekly_growth ?? 0);
      next[r.id] = g;
      const prev = prevGrowth.current[r.id];
      if (prev !== undefined && g > prev) bumps[r.id] = g - prev;
    }
    prevGrowth.current = next;
    if (Object.keys(bumps).length === 0) return;
    setFlashIds((cur) => ({ ...cur, ...bumps }));
    const ids = Object.keys(bumps);
    const t = window.setTimeout(() => {
      setFlashIds((cur) => {
        const copy = { ...cur };
        for (const id of ids) delete copy[id];
        return copy;
      });
    }, TRENDING_GROWTH_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [all]);

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
            prevTrendingCount.current = trendingCount;
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                "recipes:trendingCount",
                JSON.stringify({ count: trendingCount, ts: Date.now() }),
              );
            }
            setPulseCounter(false);
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
