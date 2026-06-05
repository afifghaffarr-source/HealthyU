import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { listSeoRecipes } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/resep/")({
  loader: () => listSeoRecipes(),
  head: () => ({
    meta: [
      { title: "Resep Sehat Indonesia | HealthyU" },
      {
        name: "description",
        content:
          "Kumpulan resep makanan sehat Indonesia lengkap dengan kalori, protein, dan langkah memasak. Cocok untuk diet & gaya hidup sehat.",
      },
      { property: "og:title", content: "Resep Sehat — HealthyU" },
      { property: "og:description", content: "Resep diet Indonesia dengan info nutrisi lengkap." },
      { property: "og:url", content: canonical("/resep") },
    ],
    links: [{ rel: "canonical", href: canonical("/resep") }],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">Gagal memuat: {error.message}</p>
    </main>
  ),
  component: ResepHub,
});

function ResepHub() {
  const items = Route.useLoaderData();
  type R = (typeof items)[number];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Resep Sehat Indonesia</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} resep dengan info kalori & nutrisi lengkap.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r: R) => (
          <li key={r.slug}>
            <Link
              to="/resep/$slug"
              params={{ slug: r.slug }}
              className="block h-full rounded-xl border bg-card p-5 hover:bg-accent"
            >
              {r.category && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {r.category}
                </p>
              )}
              <h2 className="mt-1 font-semibold leading-tight">{r.title}</h2>
              {r.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {r.calories != null && <span>{r.calories} kcal</span>}
                {r.protein_g != null && <span>{r.protein_g}g protein</span>}
                {r.total_min != null && <span>{r.total_min} mnt</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}