import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CaretLeft, CaretRight, ArrowLeft } from "@phosphor-icons/react";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { listSeoArticles } from "@/features/content/lib/seoContent.functions";

const ITEMS_PER_PAGE = 9;

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
      { property: "og:title", content: "Artikel Kesehatan · HealthyU" },
      { property: "og:description", content: "Tips diet, olahraga, dan kesehatan berbasis sains." },
      { property: "og:url", content: canonical("/artikel") },
    ],
    links: [{ rel: "canonical", href: canonical("/artikel") }, ...hreflangAlternates("/artikel")],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
    </main>
  ),
  component: ArtikelHub,
});

function ArtikelHub() {
  const items = Route.useLoaderData();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = items.slice(startIndex, endIndex);

  type Article = (typeof items)[number];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke Profil
        </Link>
        <h1 className="text-3xl font-bold">Artikel Kesehatan</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} artikel terbaru seputar diet, olahraga, nutrisi, dan gaya hidup sehat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {currentItems.map((a: Article) => (
          <Link
            key={a.slug}
            to="/artikel/$slug"
            params={{ slug: a.slug }}
            className="group block overflow-hidden rounded-xl border bg-card hover:bg-accent transition-colors"
          >
            {a.image_url && (
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-5">
              {a.category && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {a.category}
                </p>
              )}
              <h2 className="mt-1 font-semibold leading-tight line-clamp-2">{a.title}</h2>
              {a.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {a.reading_time_minutes && <span>{a.reading_time_minutes} menit baca</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <CaretLeft size={16} weight="bold" />
            Sebelumnya
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[40px] rounded-lg px-3 py-2 text-sm font-medium ${
                  currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Selanjutnya
            <CaretRight size={16} weight="bold" />
          </button>
        </nav>
      )}
    </main>
  );
}
