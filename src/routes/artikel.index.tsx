import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { listSeoArticles } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/artikel/")({
  loader: () => listSeoArticles(),
  head: () => ({
    meta: [
      { title: "Artikel Kesehatan, Diet & Olahraga | HealthyU" },
      {
        name: "description",
        content:
          "Baca artikel terbaru seputar diet sehat, olahraga, nutrisi, tidur, dan gaya hidup. Tips berbasis sains dari tim HealthyU.",
      },
      { property: "og:title", content: "Artikel Kesehatan — HealthyU" },
      { property: "og:description", content: "Tips diet, olahraga, dan kesehatan berbasis sains." },
      { property: "og:url", content: canonical("/artikel") },
    ],
    links: [{ rel: "canonical", href: canonical("/artikel") }],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">Gagal memuat: {error.message}</p>
    </main>
  ),
  component: ArtikelHub,
});

function ArtikelHub() {
  const items = Route.useLoaderData();
  type Article = (typeof items)[number];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Artikel Kesehatan</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} artikel terbaru seputar diet, olahraga, nutrisi, dan gaya hidup sehat.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a: Article) => (
          <li key={a.slug}>
            <Link
              to="/artikel/$slug"
              params={{ slug: a.slug }}
              className="block h-full rounded-xl border bg-card p-5 hover:bg-accent"
            >
              {a.category && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {a.category}
                </p>
              )}
              <h2 className="mt-1 font-semibold leading-tight">{a.title}</h2>
              {a.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
              )}
              {a.reading_time_minutes && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {a.reading_time_minutes} menit baca
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}