import { Bookmark, Star, TrendingUp } from "lucide-react";

export type RecipeSortMode = "title" | "rating" | "popular" | "trending";

export const RECIPE_CATS = [
  { id: "all", label: "Semua" },
  { id: "breakfast", label: "Sarapan" },
  { id: "main", label: "Utama" },
  { id: "dinner", label: "Malam" },
  { id: "snack", label: "Snack" },
] as const;

export type RecipeCatId = (typeof RECIPE_CATS)[number]["id"];

export function RecipeFilters({
  cat,
  setCat,
  sort,
  setSort,
  trendingOnly,
  setTrendingOnly,
  trendingCount,
  pulseCounter,
  pulseTrending,
  onTrendingClick,
}: {
  cat: RecipeCatId;
  setCat: (v: RecipeCatId) => void;
  sort: RecipeSortMode;
  setSort: (v: RecipeSortMode) => void;
  trendingOnly: boolean;
  setTrendingOnly: (fn: (v: boolean) => boolean) => void;
  trendingCount: number;
  pulseCounter: boolean;
  pulseTrending: boolean;
  onTrendingClick: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
      {RECIPE_CATS.map((c) => (
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
          sort === "rating" ? "bg-amber-400 text-amber-950" : "bg-card outline-1 outline-black/10"
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
        onClick={onTrendingClick}
        className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
          sort === "trending" ? "bg-orange-500 text-white" : "bg-card outline-1 outline-black/10"
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
  );
}