import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { listDiets } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/diet/")({
  loader: () => listDiets(),
  head: () => ({
    meta: [
      { title: "Panduan Diet: Keto, IF, Mediterania & Lainnya | HealthyU" },
      {
        name: "description",
        content:
          "Panduan lengkap 10+ jenis diet populer: Keto, Intermittent Fasting, Mediterania, DASH, Vegan, Paleo. Pro, kontra, dan contoh menu.",
      },
      { property: "og:title", content: "Panduan Diet Populer — HealthyU" },
      { property: "og:description", content: "Pilih diet yang tepat untukmu." },
      { property: "og:url", content: canonical("/diet") },
    ],
    links: [{ rel: "canonical", href: canonical("/diet") }, ...hreflangAlternates("/diet")],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
    </main>
  ),
  component: DietHub,
});

function DietHub() {
  const items = Route.useLoaderData();
  type Diet = (typeof items)[number];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Panduan Diet</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} panduan diet populer dengan kelebihan, kekurangan, dan contoh menu.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d: Diet) => (
          <li key={d.slug}>
            <Link
              to="/diet/$slug"
              params={{ slug: d.slug }}
              className="block rounded-xl border bg-card p-5 hover:bg-accent"
            >
              <h2 className="font-semibold">{d.name}</h2>
              {d.short_description && (
                <p className="mt-1 text-sm text-muted-foreground">{d.short_description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
