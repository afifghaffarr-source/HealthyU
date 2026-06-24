import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Flame, ChevronRight } from "lucide-react";
import { getRecommendedContent } from "@/features/recommendations/lib/recommendations.functions";

type Props = {
  /** Slug of the recipe currently being viewed — excluded from the strip. */
  currentSlug: string;
};

/**
 * "Rekomendasi Untukmu" strip on /resep/$slug. Auth-required.
 * Reuses getRecommendedContent (which scores recipes by user profile) and
 * shows top 3, filtering out the recipe currently being viewed.
 */
export function RecommendationsStrip({ currentSlug }: Props) {
  const fn = useServerFn(getRecommendedContent);
  const { data } = useQuery({
    queryKey: ["recipe-recs"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const items = (data?.recipes ?? []).filter((r) => r.slug !== currentSlug).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Rekomendasi Untukmu</h2>
        <Link
          to="/resep"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Lihat semua <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((r) =>
          r.slug ? (
            <Link
              key={r.id}
              to="/resep/$slug"
              params={{ slug: r.slug }}
              className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/40 transition flex flex-col"
            >
              {r.image_url && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={r.image_url}
                    alt={r.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 flex-1">
                <p className="text-sm font-semibold leading-tight line-clamp-2 min-h-10">
                  {r.title}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {r.calories != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <Flame className="size-3 text-coral" /> {r.calories} kkal
                    </span>
                  )}
                  {r.avg_rating != null && r.avg_rating > 0 && (
                    <span>★ {r.avg_rating.toFixed(1)}</span>
                  )}
                </div>
              </div>
            </Link>
          ) : null,
        )}
      </div>
    </section>
  );
}
