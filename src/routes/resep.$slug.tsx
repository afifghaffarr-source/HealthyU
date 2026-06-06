import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonical, SITE_NAME } from "@/lib/seo";
import { getSeoRecipe } from "@/features/content/lib/seoContent.functions";

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
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/resep" className="hover:text-foreground">
          Resep
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{r.title}</span>
      </nav>
      <header className="mb-6">
        {r.category && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.category}</p>
        )}
        <h1 className="mt-1 text-3xl font-bold">{r.title}</h1>
        {r.description && <p className="mt-2 text-lg text-muted-foreground">{r.description}</p>}
      </header>

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

      {r.tags && r.tags.length > 0 && (
        <footer className="mt-8 flex flex-wrap gap-2">
          {r.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs">
              #{t}
            </span>
          ))}
        </footer>
      )}
    </main>
  );
}
