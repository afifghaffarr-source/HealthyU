import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { canonical, SITE_NAME } from "@/lib/seo";
import { getSeoArticle } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/artikel/$slug")({
  loader: async ({ params }) => {
    const a = await getSeoArticle({ data: { slug: params.slug } });
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData, params }) => {
    const a = loaderData;
    const title = a ? `${a.title} | ${SITE_NAME}` : `Artikel | ${SITE_NAME}`;
    const desc = a?.excerpt ?? "Artikel kesehatan HealthyU.";
    const url = canonical(`/artikel/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(a?.keywords && a.keywords.length > 0
          ? [{ name: "keywords", content: a.keywords.join(", ") }]
          : []),
        { property: "og:title", content: a?.title ?? title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(a?.image_url ? [{ property: "og:image", content: a.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: a
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: a.title,
                description: a.excerpt ?? undefined,
                image: a.image_url ? [a.image_url] : undefined,
                datePublished: a.published_at ?? undefined,
                dateModified: a.updated_at ?? a.published_at ?? undefined,
                author: {
                  "@type": "Organization",
                  name: a.author_name ?? "HealthyU",
                },
                publisher: {
                  "@type": "Organization",
                  name: SITE_NAME,
                  logo: { "@type": "ImageObject", url: canonical("/icon-512.svg") },
                },
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                articleSection: a.category ?? undefined,
                keywords: a.keywords?.join(", "),
                wordCount: a.reading_time_minutes ? a.reading_time_minutes * 200 : undefined,
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
                  { "@type": "ListItem", position: 2, name: "Artikel", item: canonical("/artikel") },
                  { "@type": "ListItem", position: 3, name: a.title, item: url },
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
      <h1 className="text-2xl font-bold">Artikel tidak ditemukan</h1>
      <Link to="/artikel" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua artikel
      </Link>
    </main>
  ),
  component: ArtikelDetail,
});

function ArtikelDetail() {
  const a = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/artikel" className="hover:text-foreground">Artikel</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{a.title}</span>
      </nav>
      <header className="mb-6">
        {a.category && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.category}</p>
        )}
        <h1 className="mt-1 text-3xl font-bold">{a.title}</h1>
        {a.excerpt && <p className="mt-2 text-lg text-muted-foreground">{a.excerpt}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          {a.author_name} · {a.reading_time_minutes ?? 5} menit baca
          {a.published_at && ` · ${new Date(a.published_at).toLocaleDateString("id-ID")}`}
        </p>
      </header>
      <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {a.content}
        </ReactMarkdown>
      </article>
      {a.tags && a.tags.length > 0 && (
        <footer className="mt-8 flex flex-wrap gap-2">
          {a.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs">
              #{t}
            </span>
          ))}
        </footer>
      )}
    </main>
  );
}