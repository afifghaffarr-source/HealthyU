import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { canonical, SITE_NAME } from "@/lib/seo";
import { getSeoRecipe } from "@/features/content/lib/seoContent.functions";
import { getBookmarkStateForSlug } from "@/features/recipes/lib/recipeBookmarksPublic.functions";
import { getRatingStateForSlug } from "@/features/recipes/lib/recipeRatingsPublic.functions";
import { getOptionalUser } from "@/integrations/supabase/optional-auth";
import { toggleRecipeBookmark } from "@/features/recipes/lib/recipeBookmarks.functions";
import { Bookmark, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { RatingForm, type RatingState } from "@/features/recipes/components/RatingForm";
import { ReviewsSection } from "@/features/recipes/components/ReviewsSection";
import { RemixModal } from "@/features/recipes/components/RemixModal";
import { useState } from "react";

function minutesToISO(min?: number | null): string | undefined {
  if (!min || min <= 0) return undefined;
  return `PT${Math.round(min)}M`;
}

export const Route = createFileRoute("/resep/$slug")({
  loader: async ({ params }) => {
    const r = await getSeoRecipe({ data: { slug: params.slug } });
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData, params }) => {
    const r = loaderData;
    const title = r ? `Resep ${r.title} | ${SITE_NAME}` : `Resep | ${SITE_NAME}`;
    const desc = r?.description ?? "Resep sehat HealthyU dengan info nutrisi.";
    const url = canonical(`/resep/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(r?.keywords && r.keywords.length > 0
          ? [{ name: "keywords", content: r.keywords.join(", ") }]
          : []),
        { property: "og:title", content: r?.title ?? title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(r?.image_url ? [{ property: "og:image", content: r.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: r
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Recipe",
                name: r.title,
                description: r.description ?? undefined,
                image: r.image_url ? [r.image_url] : undefined,
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                recipeCategory: r.category ?? undefined,
                recipeCuisine: r.cuisine ?? undefined,
                keywords: Array.isArray(r.tags) ? r.tags.join(", ") : undefined,
                recipeYield: r.servings ? `${r.servings} porsi` : undefined,
                prepTime: minutesToISO(r.prep_min),
                cookTime: minutesToISO(r.cook_min),
                totalTime: minutesToISO(r.total_min ?? (r.prep_min ?? 0) + (r.cook_min ?? 0)),
                recipeIngredient: r.ingredients ?? undefined,
                recipeInstructions: (r.instructions ?? []).map((step: string, idx: number) => ({
                  "@type": "HowToStep",
                  position: idx + 1,
                  text: step,
                })),
                nutrition: r.calories
                  ? {
                      "@type": "NutritionInformation",
                      calories: `${r.calories} kcal`,
                      proteinContent: r.protein_g ? `${r.protein_g} g` : undefined,
                      carbohydrateContent: r.carbs_g ? `${r.carbs_g} g` : undefined,
                      fatContent: r.fat_g ? `${r.fat_g} g` : undefined,
                      fiberContent: r.fiber_g ? `${r.fiber_g} g` : undefined,
                      servingSize: r.servings ? `1/${r.servings} resep` : undefined,
                    }
                  : undefined,
                inLanguage: "id-ID",
                author: { "@type": "Organization", name: SITE_NAME },
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Beranda", item: canonical("/") },
                  { "@type": "ListItem", position: 2, name: "Resep", item: canonical("/resep") },
                  { "@type": "ListItem", position: 3, name: r.title, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Resep tidak ditemukan</h1>
      <Link to="/resep" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua resep
      </Link>
    </main>
  ),
  component: ResepDetail,
});

function ResepDetail() {
  const r = Route.useLoaderData();
  const qc = useQueryClient();
  const [remixOpen, setRemixOpen] = useState(false);

  // Auth state (used to gate bookmark button + future auth features)
  const userFn = useServerFn(getOptionalUser);
  const { data: userData } = useQuery({
    queryKey: ["optional-user"],
    queryFn: () => userFn(),
    staleTime: 60_000,
  });
  const userId = userData?.userId ?? null;
  const isAuthed = !!userId;

  // Bookmark state for the current recipe
  const bookmarkFn = useServerFn(getBookmarkStateForSlug);
  const { data: bmState } = useQuery({
    queryKey: ["bookmark-state", r.slug, userId],
    queryFn: () => bookmarkFn({ data: { slug: r.slug, userId } }),
    enabled: isAuthed && !!r.recipesId,
    staleTime: 30_000,
  });

  // Bookmark toggle (requires auth + recipesId)
  const toggleBm = useServerFn(toggleRecipeBookmark);
  const bmMut = useMutation({
    mutationFn: () => {
      if (!bmState?.recipesId) throw new Error("Resep belum siap di-save");
      return toggleBm({ data: { recipe_id: bmState.recipesId } });
    },
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Resep disimpan" : "Bookmark dihapus");
      qc.invalidateQueries({ queryKey: ["bookmark-state", r.slug, userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Rating state (anon can see aggregate, authed sees personal)
  const ratingFn = useServerFn(getRatingStateForSlug);
  const { data: ratingState } = useQuery<RatingState>({
    queryKey: ["rating-state", r.slug, userId],
    queryFn: () => ratingFn({ data: { slug: r.slug, userId } }),
    staleTime: 30_000,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/resep" className="hover:text-foreground">
          Resep
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{r.title}</span>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {r.category && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.category}</p>
          )}
          <h1 className="mt-1 text-3xl font-bold">{r.title}</h1>
          {r.description && <p className="mt-2 text-lg text-muted-foreground">{r.description}</p>}
        </div>
        {isAuthed && r.recipesId && (
          <button
            onClick={() => bmMut.mutate()}
            disabled={bmMut.isPending}
            className="size-11 shrink-0 grid place-items-center rounded-full bg-card border border-border hover:bg-accent disabled:opacity-50"
            aria-label={bmState?.bookmarked ? "Hapus bookmark" : "Simpan resep"}
            aria-pressed={bmState?.bookmarked}
          >
            {bmMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bookmark
                className={`size-5 ${bmState?.bookmarked ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            )}
          </button>
        )}
      </header>

      {/* ── "Remix dengan AI" CTA (auth-gated) ── */}
      {isAuthed && r.recipesId && (
        <button
          type="button"
          onClick={() => setRemixOpen(true)}
          className="mb-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-coral text-primary-foreground py-3 text-sm font-semibold shadow-sm"
        >
          <Sparkles className="size-4" /> Remix dengan AI
        </button>
      )}

      {r.image_url && (
        <figure className="mb-8 overflow-hidden rounded-2xl">
          <img
            src={r.image_url}
            alt={r.title}
            loading="eager"
            className="aspect-[16/10] w-full object-cover"
          />
        </figure>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {r.calories != null && (
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Kalori</p>
            <p className="font-semibold">{r.calories} kcal</p>
          </div>
        )}
        {r.protein_g != null && (
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Protein</p>
            <p className="font-semibold">{r.protein_g} g</p>
          </div>
        )}
        {r.total_min != null && (
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Waktu</p>
            <p className="font-semibold">{r.total_min} mnt</p>
          </div>
        )}
        {r.servings != null && (
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Porsi</p>
            <p className="font-semibold">{r.servings}</p>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-semibold">Bahan-bahan</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(r.ingredients ?? []).map((ing: string, i: number) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-semibold">Cara Membuat</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {(r.instructions ?? []).map((step: string, i: number) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {/* ── Rating (auth-optional: anon sees CTA, authed sees form) ── */}
      {ratingState && (
        <div className="mb-6">
          <RatingForm slug={r.slug} state={ratingState} />
        </div>
      )}

      {/* ── Reviews (auth-optional: anon sees read-only + CTA) ── */}
      <div className="mb-6">
        <ReviewsSection slug={r.slug} isAuthed={isAuthed} recipesId={r.recipesId} />
      </div>

      {r.tags && r.tags.length > 0 && (
        <footer className="mt-8 flex flex-wrap gap-2">
          {r.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs">
              #{t}
            </span>
          ))}
        </footer>
      )}

      {remixOpen && r.recipesId && (
        <RemixModal
          open={remixOpen}
          onClose={() => setRemixOpen(false)}
          recipesId={r.recipesId}
          recipeTitle={r.title}
        />
      )}
    </main>
  );
}
