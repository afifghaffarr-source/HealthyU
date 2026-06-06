import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { getFood } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/kalori/$slug")({
  loader: async ({ params }) => {
    const food = await getFood({ data: { slug: params.slug } });
    if (!food) throw notFound();
    return food;
  },
  head: ({ loaderData, params }) => {
    const f = loaderData;
    const title = f
      ? `Kalori ${f.name} — ${f.calories} kkal per ${f.serving_size ?? "porsi"} | HealthyU`
      : "Kalori Makanan | HealthyU";
    const desc = f
      ? `${f.name}: ${f.calories} kkal, protein ${f.protein_g}g, karbo ${f.carbs_g}g, lemak ${f.fat_g}g per ${f.serving_size ?? "porsi"}.`
      : "Database kalori makanan Indonesia.";
    const url = canonical(`/kalori/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: f
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "NutritionInformation",
                name: f.name,
                calories: `${f.calories} kcal`,
                proteinContent: `${f.protein_g} g`,
                carbohydrateContent: `${f.carbs_g} g`,
                fatContent: `${f.fat_g} g`,
                fiberContent: f.fiber_g != null ? `${f.fiber_g} g` : undefined,
                sugarContent: f.sugar_g != null ? `${f.sugar_g} g` : undefined,
                sodiumContent: f.sodium_mg != null ? `${f.sodium_mg} mg` : undefined,
                servingSize: f.serving_size ?? undefined,
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Beranda", item: canonical("/") },
                  { "@type": "ListItem", position: 2, name: "Kalori", item: canonical("/kalori") },
                  { "@type": "ListItem", position: 3, name: f.name, item: url },
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
      <h1 className="text-2xl font-bold">Makanan tidak ditemukan</h1>
      <Link to="/kalori" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua makanan
      </Link>
    </main>
  ),
  component: FoodDetail,
});

function FoodDetail() {
  const f = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/kalori" className="hover:text-foreground">
          Kalori
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{f.name}</span>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{f.name}</h1>
        {f.serving_size && (
          <p className="mt-1 text-sm text-muted-foreground">
            Per {f.serving_size}
            {f.serving_grams ? ` (${f.serving_grams}g)` : ""}
          </p>
        )}
      </header>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Kalori" value={`${f.calories}`} unit="kkal" highlight />
        <Stat label="Protein" value={`${f.protein_g}`} unit="g" />
        <Stat label="Karbo" value={`${f.carbs_g}`} unit="g" />
        <Stat label="Lemak" value={`${f.fat_g}`} unit="g" />
        {f.fiber_g != null && <Stat label="Serat" value={`${f.fiber_g}`} unit="g" />}
        {f.sugar_g != null && <Stat label="Gula" value={`${f.sugar_g}`} unit="g" />}
        {f.sodium_mg != null && <Stat label="Natrium" value={`${f.sodium_mg}`} unit="mg" />}
      </section>
      {f.description && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Tentang {f.name}</h2>
          <p className="mt-2 text-muted-foreground">{f.description}</p>
        </section>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-primary bg-primary/5" : "bg-card"}`}
    >
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
