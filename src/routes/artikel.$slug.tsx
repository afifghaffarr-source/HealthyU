import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar } from "@phosphor-icons/react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { canonical, hreflangAlternates, ogImageFor, SITE_NAME } from "@/lib/seo";
import { getSeoArticle, listSeoArticles } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/artikel/$slug")({
  loader: async ({ params }) => {
    const [article, allArticles] = await Promise.all([
      getSeoArticle({ data: { slug: params.slug } }),
      listSeoArticles(),
    ]);
    if (!article) throw notFound();

    // Get related articles from same category
    const related = allArticles
      .filter((a) => a.category === article.category && a.slug !== article.slug)
      .slice(0, 3);

    return { article, related };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
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
        { property: "og:image", content: ogImageFor("articles", a?.slug) },
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangAlternates(`/artikel/${params.slug}`)],
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
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Artikel",
                    item: canonical("/artikel"),
                  },
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
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
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
  const { article: a, related } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Back Navigation */}
      <Link
        to="/artikel"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Kembali ke Artikel
      </Link>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span className="mx-2">/</span>
        <Link to="/artikel" className="hover:text-foreground">
          Artikel
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{a.title}</span>
      </nav>

      {/* Hero Image */}
      {a.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-xl bg-muted mb-8">
          <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
        </div>
      )}

      {/* Article Header */}
      <header className="mb-8">
        {a.category && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.category}</p>
        )}
        <h1 className="mt-2 text-4xl font-bold leading-tight">{a.title}</h1>
        {a.excerpt && <p className="mt-3 text-lg text-muted-foreground">{a.excerpt}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium">{a.author_name ?? "Tim HealthyU"}</span>
          {a.reading_time_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock size={16} />
              {a.reading_time_minutes} menit baca
            </span>
          )}
          {a.published_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={16} />
              {new Date(a.published_at).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </header>

      {/* Article Content */}
      <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mb-12">
        <SafeMarkdown>{a.content}</SafeMarkdown>
      </article>

      {/* Tags */}
      {a.tags && a.tags.length > 0 && (
        <div className="mb-12 flex flex-wrap gap-2">
          {a.tags.map((t: string) => (
            <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Artikel Terkait</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/artikel/$slug"
                params={{ slug: r.slug }}
                className="group block overflow-hidden rounded-xl border bg-card hover:bg-accent transition-colors"
              >
                {r.image_url && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4">
                  {r.category && (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.category}
                    </p>
                  )}
                  <h3 className="mt-1 font-semibold leading-tight line-clamp-2">{r.title}</h3>
                  {r.reading_time_minutes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.reading_time_minutes} menit baca
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
