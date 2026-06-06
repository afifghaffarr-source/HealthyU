import { Link } from "@tanstack/react-router";
import { Bookmark, Clock, Flame, Star, TrendingUp } from "lucide-react";

type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  calories: number | string;
  prep_min: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  avg_rating?: number | string | null;
  rating_count?: number | string | null;
  bookmark_count?: number | string | null;
  weekly_growth?: number | string | null;
};

export function RecipeListItem({
  r,
  popularThreshold,
  flashDelta,
}: {
  r: Recipe;
  popularThreshold: number;
  flashDelta?: number;
}) {
  return (
    <Link
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
            {flashDelta && (
              <span className="ml-1 text-orange-700 bg-orange-200 rounded-full px-1 animate-fade-in">
                +{flashDelta}
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
  );
}
