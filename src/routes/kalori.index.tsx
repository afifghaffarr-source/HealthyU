import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { listFoods } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/kalori/")({
  loader: () => listFoods(),
  head: () => ({
    meta: [
      { title: "Kalori Makanan Indonesia · Database Lengkap | HealthyU" },
      {
        name: "description",
        content:
          "Database kalori 100+ makanan Indonesia: nasi, lauk, sayur, cemilan. Lengkap dengan protein, karbo, dan lemak per porsi.",
      },
      { property: "og:title", content: "Kalori Makanan Indonesia · HealthyU" },
      {
        property: "og:description",
        content: "Cari kalori makanan favoritmu: rendang, nasi goreng, gado-gado, dan lainnya.",
      },
      { property: "og:url", content: canonical("/kalori") },
    ],
    links: [{ rel: "canonical", href: canonical("/kalori") }],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat data: {error.message}
      </p>
    </main>
  ),
  component: KaloriHub,
});

function KaloriHub() {
  const foods = Route.useLoaderData();
  type Food = (typeof foods)[number];
  const grouped: Record<string, Food[]> = {};
  for (const f of foods) {
    const k = f.category || "Lainnya";
    (grouped[k] ||= []).push(f);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Kalori Makanan Indonesia</h1>
        <p className="mt-2 text-muted-foreground">
          Database {foods.length} makanan dengan kalori dan makro per porsi.
        </p>
      </header>
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold capitalize">{cat}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <li key={f.slug}>
                <Link
                  to="/kalori/$slug"
                  params={{ slug: f.slug }}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent"
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="text-sm text-muted-foreground">{f.calories} kkal</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
