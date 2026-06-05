import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/lib/recipes.functions";
import {
  TRENDING_TTL_DAYS,
  TRENDING_COUNTER_PULSE_MS,
  TRENDING_GROWTH_FLASH_MS,
} from "@/lib/constants";
import { generateRecipeFromIngredients, type GeneratedRecipe } from "@/lib/ai-extras.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  Clock,
  Flame,
  Search,
  Sparkles,
  Loader2,
  X,
  Star,
  Bookmark,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recipes")({
  component: RecipesPage,
});

const CATS = [
  { id: "all", label: "Semua" },
  { id: "breakfast", label: "Sarapan" },
  { id: "main", label: "Utama" },
  { id: "dinner", label: "Malam" },
  { id: "snack", label: "Snack" },
] as const;

type SortMode = "title" | "rating" | "popular" | "trending";

function RecipesPage() {
  const fetchList = useServerFn(listRecipes);
  const genRecipe = useServerFn(generateRecipeFromIngredients);
  const qc = useQueryClient();
  const { pulling, refreshing } = usePullToRefresh(async () => {
    await qc.invalidateQueries({ queryKey: ["recipes"] });
  });
  const { data: all = [] } = useQuery({ queryKey: ["recipes"], queryFn: () => fetchList() });
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>(() => {
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
  const [ingredients, setIngredients] = useState("");
  const [prefs, setPrefs] = useState("");
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);

  const genMutation = useMutation({
    mutationFn: () => genRecipe({ data: { ingredients, preferences: prefs || undefined } }),
    onSuccess: (r) => setGenerated(r),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat resep"),
  });
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

        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                cat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card outline-1 outline-black/10"
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={() => setSort(sort === "rating" ? "title" : "rating")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
              sort === "rating"
                ? "bg-amber-400 text-amber-950"
                : "bg-card outline-1 outline-black/10"
            }`}
          >
            <Star className="size-3" /> Top rating
          </button>
          <button
            onClick={() => setSort(sort === "popular" ? "title" : "popular")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
              sort === "popular"
                ? "bg-primary text-primary-foreground"
                : "bg-card outline-1 outline-black/10"
            }`}
          >
            <Bookmark className="size-3" /> Terpopuler
          </button>
          <button
            onClick={() => {
              setSort(sort === "trending" ? "title" : "trending");
              // Mark current count as "seen" so the pulse stops immediately
              prevTrendingCount.current = trendingCount;
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "recipes:trendingCount",
                  JSON.stringify({ count: trendingCount, ts: Date.now() }),
                );
              }
              setPulseCounter(false);
            }}
            className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
              sort === "trending"
                ? "bg-orange-500 text-white"
                : "bg-card outline-1 outline-black/10"
            }`}
          >
            <TrendingUp className="size-3" /> Trending
            {trendingCount > 0 && (
              <span
                className={`ml-0.5 text-[9px] font-bold tabular-nums rounded-full px-1.5 py-px transition-colors ${
                  pulseCounter
                    ? "bg-orange-300 text-orange-900 animate-pulse"
                    : sort === "trending"
                      ? "bg-white/25 text-white"
                      : "bg-orange-100 text-orange-700"
                }`}
              >
                {trendingCount}
              </span>
            )}
            {pulseTrending && (
              <span className="absolute -top-0.5 -right-0.5 flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
              </span>
            )}
          </button>
          {sort === "trending" && (
            <button
              onClick={() => setTrendingOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                trendingOnly
                  ? "bg-orange-100 text-orange-700 outline-1 outline-orange-300"
                  : "bg-card outline-1 outline-black/10"
              }`}
            >
              Hanya trending
            </button>
          )}
        </div>

        <section className="space-y-3">
          {trending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                🔥 Trending minggu ini
              </p>
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
                {trending.map((r) => (
                  <Link
                    key={r.id}
                    to="/recipes/$id"
                    params={{ id: r.id }}
                    className="shrink-0 w-48 bg-card p-3 rounded-2xl outline-1 outline-orange-200"
                  >
                    <p className="font-bold text-sm line-clamp-1">{r.title}</p>
                    <p className="text-[10px] text-orange-600 font-bold mt-1">
                      +{r.weekly_growth} bookmark / 7 hari
                    </p>
                    <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3" />
                        {r.calories}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {r.prep_min}m
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {items.map((r) => (
            <Link
              key={r.id}
              to="/recipes/$id"
              params={{ id: r.id }}
              className="block bg-card p-4 rounded-2xl outline-1 outline-black/5"
            >
              <h3 className="font-bold">{r.title}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {Number(r.bookmark_count ?? 0) >= popularThreshold && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    🔥 Populer
                  </span>
                )}
                {Number(r.weekly_growth ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                    <TrendingUp className="size-2.5" />+{r.weekly_growth}/7h
                    {flashIds[r.id] && (
                      <span className="ml-1 text-orange-700 bg-orange-200 rounded-full px-1 animate-fade-in">
                        +{flashIds[r.id]}
                      </span>
                    )}
                  </span>
                )}
              </div>
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
                <span>
                  P{Math.round(Number(r.protein_g))} K{Math.round(Number(r.carbs_g))} L
                  {Math.round(Number(r.fat_g))}
                </span>
                {Number(r.rating_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    {Number(r.avg_rating ?? 0).toFixed(1)}
                    <span className="text-muted-foreground font-normal">({r.rating_count})</span>
                  </span>
                )}
                {Number(r.bookmark_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <Bookmark className="size-3 fill-primary" />
                    {r.bookmark_count}
                  </span>
                )}
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Tidak ada resep</p>
          )}
        </section>
      </div>

      {aiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setAiOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Resep AI
              </h2>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            {!generated ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Bahan di kulkas
                  </label>
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    rows={3}
                    placeholder="contoh: telur, bayam, tahu, bawang putih"
                    className="mt-1 w-full bg-muted/60 rounded-xl p-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Preferensi (opsional)
                  </label>
                  <input
                    value={prefs}
                    onChange={(e) => setPrefs(e.target.value)}
                    placeholder="rendah karbo, pedas, cepat..."
                    className="mt-1 w-full bg-muted/60 rounded-xl p-3 text-sm outline-none"
                  />
                </div>
                <button
                  disabled={!ingredients.trim() || genMutation.isPending}
                  onClick={() => genMutation.mutate()}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {genMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {genMutation.isPending ? "Membuat resep..." : "Buat Resep"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Resep disesuaikan dengan kondisi kesehatan & alergi kamu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base">{generated.title}</h3>
                  <p className="text-xs text-muted-foreground">{generated.description}</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Mini label="Kalori" v={`${generated.calories}`} />
                  <Mini label="Protein" v={`${generated.protein_g}g`} />
                  <Mini label="Karbo" v={`${generated.carbs_g}g`} />
                  <Mini label="Lemak" v={`${generated.fat_g}g`} />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {generated.prep_min} min
                  </span>
                  <span>{generated.servings} porsi</span>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2">Bahan</p>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {generated.ingredients.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2">Cara membuat</p>
                  <ol className="text-sm space-y-1.5 list-decimal pl-5">
                    {generated.instructions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                </div>
                {generated.tips.length > 0 && (
                  <div className="bg-mint/40 rounded-xl p-3">
                    <p className="text-xs font-bold mb-1">💡 Tips sehat</p>
                    <ul className="text-xs space-y-1 list-disc pl-5">
                      {generated.tips.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => {
                    setGenerated(null);
                    setIngredients("");
                    setPrefs("");
                  }}
                  className="w-full bg-muted rounded-xl py-2.5 text-sm font-semibold"
                >
                  Buat resep lain
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="bg-muted/60 rounded-xl p-2">
      <p className="text-sm font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
