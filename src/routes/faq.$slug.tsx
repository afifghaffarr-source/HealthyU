import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { canonical, SITE_NAME } from "@/lib/seo";
import { getSeoFaq } from "@/lib/seoContent.functions";

interface QA { question: string; answer: string }

export const Route = createFileRoute("/faq/$slug")({
  loader: async ({ params }) => {
    const f = await getSeoFaq({ data: { slug: params.slug } });
    if (!f) throw notFound();
    return f;
  },
  head: ({ loaderData, params }) => {
    const f = loaderData;
    const title = f ? `${f.title} | ${SITE_NAME}` : `FAQ | ${SITE_NAME}`;
    const desc = f?.description ?? "FAQ kesehatan HealthyU.";
    const url = canonical(`/faq/${params.slug}`);
    const qas = (f?.questions as QA[] | undefined) ?? [];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(f?.keywords && f.keywords.length > 0
          ? [{ name: "keywords", content: f.keywords.join(", ") }]
          : []),
        { property: "og:title", content: f?.title ?? title },
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
                "@type": "FAQPage",
                mainEntity: qas.map((q) => ({
                  "@type": "Question",
                  name: q.question,
                  acceptedAnswer: { "@type": "Answer", text: q.answer },
                })),
                inLanguage: "id-ID",
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Beranda", item: canonical("/") },
                  { "@type": "ListItem", position: 2, name: "FAQ", item: canonical("/faq") },
                  { "@type": "ListItem", position: 3, name: f.title, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">Gagal memuat: {error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">FAQ tidak ditemukan</h1>
      <Link to="/faq" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua FAQ
      </Link>
    </main>
  ),
  component: FaqDetail,
});

function FaqDetail() {
  const f = Route.useLoaderData();
  const qas = (f.questions as QA[] | null) ?? [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/faq" className="hover:text-foreground">FAQ</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{f.title}</span>
      </nav>
      <header className="mb-6">
        {f.category && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{f.category}</p>
        )}
        <h1 className="mt-1 text-3xl font-bold">{f.title}</h1>
        {f.description && <p className="mt-2 text-lg text-muted-foreground">{f.description}</p>}
      </header>
      <div className="space-y-4">
        {qas.map((q, i) => (
          <details key={i} className="group rounded-xl border bg-card p-4" open={i === 0}>
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="mr-2 text-primary">Q{i + 1}.</span>
              {q.question}
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{q.answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}