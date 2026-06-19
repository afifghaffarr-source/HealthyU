import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getRecommendedContent } from "@/features/recommendations/lib/recommendations.functions";
import { ChefHat, Sparkles, TrendingUp, Salad, Leaf, Wheat, Apple } from "lucide-react";

const opts = queryOptions({
  queryKey: ["recipe-recs"],
  queryFn: () => getRecommendedContent(),
});

type ScoredRecipe = Awaited<ReturnType<typeof getRecommendedContent>>["recipes"][number];

export const Route = createFileRoute("/_authenticated/recipes/recommendations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => (
    <div className="p-4 text-destructive">Gagal memuat: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const recipes = data.recipes;
  const articles = data.articles;
  const topRecipe = recipes[0];

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Rekomendasi Resep" showBack />

      {/* ── Theme banner (kalau ada jadwal hari ini) ─────────────────────── */}
      {data.today_theme && (
        <section className="px-5 pt-2 animate-fade-up">
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-4 flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
              <Sparkles className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">
                Tema Hari Ini
              </p>
              <p className="text-sm font-semibold mt-0.5 leading-snug">{data.today_theme}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Top pick (kalau ada, recipe dengan score tertinggi) ──────────── */}
      {topRecipe && (
        <section className="px-5 pt-4 animate-fade-up">
          <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">
            Pilihan Utama
          </h3>
          <Link
            to="/recipes/$id"
            params={{ id: topRecipe.id }}
            className="block rounded-2xl bg-card border border-primary/30 overflow-hidden hover:bg-accent transition"
          >
            <div className="flex gap-4 p-4">
              {topRecipe.image_url && (
                <img
                  loading="lazy"
                  decoding="async"
                  src={topRecipe.image_url}
                  alt=""
                  className="size-24 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base leading-tight line-clamp-2">{topRecipe.title}</p>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {topRecipe.calories != null && <span>{Math.round(topRecipe.calories)} kkal</span>}
                  {topRecipe.avg_rating != null && topRecipe.avg_rating > 0 && (
                    <span> · ★ {topRecipe.avg_rating.toFixed(1)}</span>
                  )}
                </div>
                <ReasonChips recipe={topRecipe} className="mt-2" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── Recipe grid (sisanya) ────────────────────────────────────────── */}
      <section className="px-5 pt-5 animate-fade-up">
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
            Untukmu ({recipes.length})
          </h3>
          {recipes.length < 3 && (
            <Link to="/recipes" className="text-xs text-primary font-medium hover:underline">
              Lihat semua
            </Link>
          )}
        </div>

        {recipes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recipes.slice(1).map((r) => (
              <Link
                key={r.id}
                to="/recipes/$id"
                params={{ id: r.id }}
                className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/40 transition flex flex-col"
              >
                {r.image_url && (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={r.image_url}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <p className="text-sm font-semibold leading-tight line-clamp-2 min-h-10">
                    {r.title}
                  </p>
                  <div className="text-[11px] text-muted-foreground">
                    {r.calories != null && <span>{Math.round(r.calories)} kkal</span>}
                    {r.avg_rating != null && r.avg_rating > 0 && (
                      <span> · ★ {r.avg_rating.toFixed(1)}</span>
                    )}
                  </div>
                  <ReasonChips recipe={r} compact className="mt-auto pt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Artikel relevan ──────────────────────────────────────────────── */}
      {articles.length > 0 && (
        <section className="px-5 pt-6 animate-fade-up">
          <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-3">
            Bacaan Terkait ({articles.length})
          </h3>
          <ul className="space-y-2">
            {articles.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  to="/artikel/$slug"
                  params={{ slug: a.slug }}
                  className="block p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition"
                >
                  <div className="flex items-start gap-3">
                    {a.image_url && (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={a.image_url}
                        alt=""
                        className="size-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug line-clamp-2">{a.title}</p>
                      {a.reading_time_minutes != null && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {a.reading_time_minutes} mnt baca
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomNav />
    </div>
  );
}

/* ── Reason chips: explain WHY this recipe is recommended ────────────────── */

function ReasonChips({
  recipe,
  compact = false,
  className = "",
}: {
  recipe: ScoredRecipe;
  compact?: boolean;
  className?: string;
}) {
  const chips: {
    label: string;
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    tone: string;
  }[] = [];

  // Score-based reasons
  if (recipe._score >= 50) {
    chips.push({ label: "Hari ini", icon: TrendingUp, tone: "bg-primary/10 text-primary" });
  }
  if (recipe.avg_rating != null && recipe.avg_rating >= 4.5) {
    chips.push({
      label: "Top rating",
      icon: Sparkles,
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    });
  }

  // Dietary flags
  if (recipe.is_vegetarian) {
    chips.push({
      label: "Vegetarian",
      icon: Salad,
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    });
  }
  if (recipe.is_vegan) {
    chips.push({
      label: "Vegan",
      icon: Leaf,
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    });
  }
  if (recipe.is_keto_friendly) {
    chips.push({
      label: "Keto",
      icon: Wheat,
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    });
  }
  if (recipe.is_halal && !chips.some((c) => c.label === "Vegetarian")) {
    chips.push({
      label: "Halal",
      icon: ChefHat,
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    });
  }
  if (recipe.calories != null && recipe.calories > 0 && recipe.calories < 350) {
    chips.push({
      label: "Ringan",
      icon: Apple,
      tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    });
  }

  if (chips.length === 0) return null;

  const display = compact ? chips.slice(0, 2) : chips.slice(0, 3);

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {display.map((c, i) => {
        const Icon = c.icon;
        return (
          <span
            key={`${c.label}-${i}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${c.tone}`}
          >
            <Icon className="size-3" aria-hidden />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Empty state: kasih fallback CTA ke meal plan generator ─────────────── */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
      <div className="size-12 mx-auto rounded-full bg-muted grid place-items-center mb-3">
        <ChefHat className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-semibold">Belum ada resep yang match</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
        Coba longgarkan preferensi diet di profil, atau generate meal plan dari sisa kalori hari
        ini.
      </p>
      <Link
        to="/recipes"
        className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
      >
        Lihat semua resep
      </Link>
    </div>
  );
}
