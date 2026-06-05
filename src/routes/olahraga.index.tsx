import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { listExercises } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/olahraga/")({
  loader: () => listExercises(),
  head: () => ({
    meta: [
      { title: "Daftar Olahraga & Pembakaran Kalori (MET) | HealthyU" },
      {
        name: "description",
        content:
          "Database 30+ olahraga lengkap dengan nilai MET untuk hitung kalori terbakar. Lari, sepeda, renang, HIIT, dan lainnya.",
      },
      { property: "og:title", content: "Daftar Olahraga & Kalori Terbakar — HealthyU" },
      { property: "og:description", content: "Hitung kalori terbakar berdasarkan nilai MET." },
      { property: "og:url", content: canonical("/olahraga") },
    ],
    links: [{ rel: "canonical", href: canonical("/olahraga") }],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">Gagal memuat: {error.message}</p>
    </main>
  ),
  component: OlahragaHub,
});

function OlahragaHub() {
  const items = Route.useLoaderData();
  type Ex = (typeof items)[number];
  const grouped: Record<string, Ex[]> = {};
  for (const it of items) {
    const k = it.category || "Lainnya";
    (grouped[k] ||= []).push(it);
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Olahraga & Pembakaran Kalori</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} olahraga dengan nilai MET (Metabolic Equivalent of Task).
        </p>
      </header>
      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold capitalize">{cat}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <li key={e.slug}>
                <Link
                  to="/olahraga/$slug"
                  params={{ slug: e.slug }}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent"
                >
                  <span className="font-medium">{e.name}</span>
                  <span className="text-sm text-muted-foreground">MET {e.met}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}