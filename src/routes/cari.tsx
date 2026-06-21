import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { TopAppBar } from "@/components/healthyu/top-app-bar";

const searchSchema = z.object({
  q: z.string().max(100).optional().default(""),
});

/**
 * Server-only search RPC. Wraps the Supabase query in createServerFn so the
 * `*.server.ts` import never leaks into the client bundle (the import-
 * protection plugin blocks `client.server` from any client-rendered file).
 *
 * Replaces the previous `loader` which did a dynamic `await import("client.server")`.
 * That pattern is unsafe with strict import-protection (e.g. on Cloudflare
 * Pages where the bundler enforces file-pattern denials).
 */
const searchCariFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().max(100).default("") }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.q.trim();
    if (!q.length) return { articles: [], recipes: [], query: "" };
    const pattern = `%${q}%`;
    const [artRes, recRes] = await Promise.all([
      supabaseAdmin
        .from("seo_articles")
        .select("slug,title,excerpt,category")
        .eq("published", true)
        .ilike("title", pattern)
        .order("published_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("seo_recipes")
        .select("slug,title,description,category,calories")
        .eq("published", true)
        .ilike("title", pattern)
        .order("published_at", { ascending: false })
        .limit(20),
    ]);
    return {
      articles: artRes.data ?? [],
      recipes: recRes.data ?? [],
      query: q,
    };
  });

export const Route = createFileRoute("/cari")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Cari — HealthyU" },
      {
        name: "description",
        content: "Cari artikel, resep, dan panduan diet sehat di HealthyU.",
      },
      { property: "og:title", content: "Cari — HealthyU" },
      { property: "og:url", content: canonical("/cari") },
    ],
    links: [{ rel: "canonical", href: canonical("/cari") }, ...hreflangAlternates("/cari")],
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchCariFn({ data: { q: deps.q ?? "" } }),
  component: CariPage,
});

function CariPage() {
  const { articles, recipes, query } = Route.useLoaderData();
  const { q } = Route.useSearch();
  const hasQuery = (q ?? "").trim().length > 0;

  return (
    <main className="min-h-dvh bg-background pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-6">
        <TopAppBar
          title="Cari"
          subtitle={query ? `Hasil untuk "${query}"` : "Temukan artikel & resep"}
          showBack
        />

        <form method="GET" action="/cari" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari artikel, resep, panduan…"
            className="flex-1 rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Cari
          </button>
        </form>

        {!hasQuery && (
          <p className="text-center text-muted-foreground py-12">
            Ketik kata kunci untuk mencari artikel dan resep sehat.
          </p>
        )}

        {hasQuery && articles.length === 0 && recipes.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Tidak ada hasil untuk &ldquo;{query}&rdquo;. Coba kata kunci lain.
          </p>
        )}

        {articles.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">Artikel ({articles.length})</h2>
            <ul className="space-y-2">
              {articles.map(
                (a: {
                  slug: string;
                  title: string;
                  excerpt: string | null;
                  category: string | null;
                }) => (
                  <li key={a.slug}>
                    <Link
                      to="/artikel/$slug"
                      params={{ slug: a.slug }}
                      className="block rounded-xl border bg-card p-4 hover:bg-accent transition"
                    >
                      {a.category && (
                        <span className="text-xs font-medium uppercase text-primary">
                          {a.category}
                        </span>
                      )}
                      <h3 className="font-semibold mt-1">{a.title}</h3>
                      {a.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {a.excerpt}
                        </p>
                      )}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {recipes.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">Resep ({recipes.length})</h2>
            <ul className="space-y-2">
              {recipes.map(
                (r: {
                  slug: string;
                  title: string;
                  description: string | null;
                  category: string | null;
                  calories: number | null;
                }) => (
                  <li key={r.slug}>
                    <Link
                      to="/resep/$slug"
                      params={{ slug: r.slug }}
                      className="block rounded-xl border bg-card p-4 hover:bg-accent transition"
                    >
                      {r.category && (
                        <span className="text-xs font-medium uppercase text-primary">
                          {r.category}
                        </span>
                      )}
                      <h3 className="font-semibold mt-1">{r.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {r.description && <span className="line-clamp-1">{r.description}</span>}
                        {r.calories != null && <span className="shrink-0">{r.calories} kkal</span>}
                      </div>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
