import { createFileRoute, Link } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { listSeoFaqs } from "@/lib/seoContent.functions";

export const Route = createFileRoute("/faq/")({
  loader: () => listSeoFaqs(),
  head: () => ({
    meta: [
      { title: "FAQ Kesehatan, Diet & Olahraga | HealthyU" },
      {
        name: "description",
        content:
          "Kumpulan tanya jawab seputar diet, kalori, BMI, olahraga, tidur, dan kesehatan harian. Jawaban singkat berbasis sains.",
      },
      { property: "og:title", content: "FAQ Kesehatan — HealthyU" },
      { property: "og:description", content: "Tanya jawab seputar diet, olahraga, dan kesehatan." },
      { property: "og:url", content: canonical("/faq") },
    ],
    links: [{ rel: "canonical", href: canonical("/faq") }],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">Gagal memuat: {error.message}</p>
    </main>
  ),
  component: FaqHub,
});

function FaqHub() {
  const items = Route.useLoaderData();
  type Faq = (typeof items)[number];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">FAQ Kesehatan</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} topik tanya jawab seputar diet, olahraga, dan gaya hidup sehat.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f: Faq) => (
          <li key={f.slug}>
            <Link
              to="/faq/$slug"
              params={{ slug: f.slug }}
              className="block h-full rounded-xl border bg-card p-5 hover:bg-accent"
            >
              {f.category && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {f.category}
                </p>
              )}
              <h2 className="mt-1 font-semibold leading-tight">{f.title}</h2>
              {f.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{f.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}