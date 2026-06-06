import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonical } from "@/lib/seo";
import { getDiet } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/diet/$slug")({
  loader: async ({ params }) => {
    const d = await getDiet({ data: { slug: params.slug } });
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const d = loaderData;
    const title = d ? `${d.name} — Panduan Lengkap | HealthyU` : "Diet | HealthyU";
    const desc = d?.short_description ?? "Panduan diet sehat.";
    const url = canonical(`/diet/${params.slug}`);
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
      scripts: d
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: `${d.name} — Panduan Lengkap`,
                description: desc,
                author: { "@type": "Organization", name: "HealthyU" },
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Beranda", item: canonical("/") },
                  { "@type": "ListItem", position: 2, name: "Diet", item: canonical("/diet") },
                  { "@type": "ListItem", position: 3, name: d.name, item: url },
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
      <h1 className="text-2xl font-bold">Diet tidak ditemukan</h1>
      <Link to="/diet" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua panduan
      </Link>
    </main>
  ),
  component: DietDetail,
});

function DietDetail() {
  const d = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/diet" className="hover:text-foreground">
          Diet
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{d.name}</span>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{d.name}</h1>
        {d.short_description && (
          <p className="mt-2 text-lg text-muted-foreground">{d.short_description}</p>
        )}
      </header>

      {d.description && (
        <section className="mb-6">
          <p className="text-foreground">{d.description}</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {d.pros && d.pros.length > 0 && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold text-emerald-600 dark:text-emerald-400">Kelebihan</h2>
            <ul className="space-y-2 text-sm">
              {d.pros.map((p: string) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {d.cons && d.cons.length > 0 && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold text-destructive">Kekurangan</h2>
            <ul className="space-y-2 text-sm">
              {d.cons.map((c: string) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden>✗</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {d.who_for && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <h2 className="mb-2 font-semibold">Cocok untuk siapa?</h2>
          <p className="text-sm text-muted-foreground">{d.who_for}</p>
        </section>
      )}

      {d.sample_day && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <h2 className="mb-2 font-semibold">Contoh menu sehari</h2>
          <p className="text-sm text-muted-foreground">{d.sample_day}</p>
        </section>
      )}
    </main>
  );
}
