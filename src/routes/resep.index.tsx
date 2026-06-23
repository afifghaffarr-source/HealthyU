import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Clock, Flame, Sparkles, ChevronRight, Bookmark } from "lucide-react";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { listSeoRecipes } from "@/features/content/lib/seoContent.functions";
import { getOptionalUser } from "@/integrations/supabase/optional-auth";
import { TopAppBar } from "@/components/healthyu/top-app-bar";

/** SVG data-URI placeholder for broken recipe images — gradient + utensils icon */
const RECIPE_FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e0f2fe"/>
    <stop offset="100%" stop-color="#bae6fd"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <g transform="translate(200,150)" fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round">
    <path d="M-18,-30 v20 a8,8 0 0,0 16,0 v-20"/>
    <line x1="-10" y1="-10" x2="-10" y2="30"/>
    <path d="M10,-30 v25 c0,6 6,6 6,0 v-25"/>
    <line x1="16" y1="-5" x2="16" y2="30"/>
  </g>
</svg>`,
  );

/** Hook: returns an onError handler that swaps broken images to the fallback. */
function useImgFallback() {
  return useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== RECIPE_FALLBACK_IMG) {
      img.src = RECIPE_FALLBACK_IMG;
    }
  }, []);
}

export const Route = createFileRoute("/resep/")({
  loader: () => listSeoRecipes(),
  head: () => ({
    meta: [
      { title: "Resep Sehat Indonesia | HealthyU" },
      {
        name: "description",
        content:
          "Kumpulan resep makanan sehat Indonesia lengkap dengan kalori, protein, dan langkah memasak. Cocok untuk diet & gaya hidup sehat.",
      },
      { property: "og:title", content: "Resep Sehat · HealthyU" },
      { property: "og:description", content: "Resep diet Indonesia dengan info nutrisi lengkap." },
      { property: "og:url", content: canonical("/resep") },
    ],
    links: [{ rel: "canonical", href: canonical("/resep") }, ...hreflangAlternates("/resep")],
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
    </main>
  ),
  component: ResepHub,
});

/* ── Category taxonomy (derived from recipe.category) ────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  sarapan: "Sarapan",
  utama: "Hidangan Utama",
  snack: "Snack",
  dessert: "Dessert",
  minuman: "Minuman",
  sup: "Sup",
  salad: "Salad",
  side: "Pendamping",
};
const CATEGORY_ORDER = ["sarapan", "utama", "snack", "dessert", "minuman", "sup", "salad", "side"];

function ResepHub() {
  // seo_recipes Row type — typed to make filter callbacks infer properly
  type Resep = {
    slug: string;
    title: string;
    description: string | null;
    category: string | null;
    image_url: string | null;
    calories: number | null;
    protein_g: number | null;
    total_min: number | null;
    servings: number | null;
    tags: string[] | null;
  };
  const items = Route.useLoaderData() as Resep[];
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Auth state (changes the bottom CTA)
  const userFn = useServerFn(getOptionalUser);
  const { data: userData } = useQuery({
    queryKey: ["optional-user"],
    queryFn: () => userFn(),
    staleTime: 60_000,
  });
  const isAuthed = !!userData?.userId;

  // Group items by category for the sectioned layout
  const featured = items[0];
  const categoriesInUse = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) {
      if (r.category) set.add(r.category);
    }
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((r) => {
      if (activeCategory && r.category !== activeCategory) return false;
      if (!term) return true;
      return (
        r.title.toLowerCase().includes(term) ||
        (r.description?.toLowerCase().includes(term) ?? false) ||
        (r.tags?.some((t) => t.toLowerCase().includes(term)) ?? false)
      );
    });
  }, [items, q, activeCategory]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <TopAppBar title="Resep Sehat" showBack />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-6 pb-2 animate-fade-up">
        <div className="max-w-md mx-auto">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">
            Database Resep
          </p>
          <h1
            className="mt-1 text-3xl md:text-4xl font-bold leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Masak sehat, sesuai target kalorimu.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-prose leading-relaxed">
            {items.length} resep Indonesia dengan kalori, protein, dan langkah memasak. Tersimpan
            offline, siap ditelusuri kapan saja.
          </p>
        </div>
      </section>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <section className="px-4 pt-4 animate-fade-up">
        <div className="max-w-md mx-auto">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nasi goreng, ayam, sup..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm"
              aria-label="Cari resep"
            />
          </label>
        </div>
      </section>

      {/* ── Category pills ──────────────────────────────────────────────── */}
      {categoriesInUse.length > 1 && (
        <section className="px-4 pt-4 animate-fade-up">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
              <Pill
                active={activeCategory === ""}
                onClick={() => setActiveCategory("")}
                label="Semua"
              />
              {categoriesInUse.map((c) => (
                <Pill
                  key={c}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                  label={CATEGORY_LABELS[c] ?? c}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured recipe (when no filter active) ─────────────────────── */}
      {featured && !activeCategory && !q && (
        <section className="px-4 pt-6 animate-fade-up">
          <div className="max-w-md mx-auto">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
              Pilihan Editor
            </p>
            <Link
              to="/resep/$slug"
              params={{ slug: featured.slug }}
              className="block rounded-3xl bg-card border border-primary/20 overflow-hidden hover:bg-accent transition group"
            >
              {featured.image_url && (
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={featured.image_url}
                    alt={featured.title}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== RECIPE_FALLBACK_IMG)
                        e.currentTarget.src = RECIPE_FALLBACK_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                  />
                </div>
              )}
              <div className="p-5">
                <h2
                  className="text-xl font-bold leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {featured.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {featured.calories != null && (
                    <span className="inline-flex items-center gap-1">
                      <Flame className="size-3 text-coral" aria-hidden />
                      {featured.calories} kkal
                    </span>
                  )}
                  {featured.protein_g != null && <span>{featured.protein_g}g protein</span>}
                  {featured.total_min != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {featured.total_min} mnt
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── Results grid ────────────────────────────────────────────────── */}
      <section className="px-4 pt-8 animate-fade-up">
        <div className="max-w-md mx-auto">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              {activeCategory ? (CATEGORY_LABELS[activeCategory] ?? activeCategory) : "Semua Resep"}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} hasil</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState query={q} />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered
                .filter((r) => r.slug !== featured?.slug || activeCategory || q)
                .map((r) => (
                  <RecipeCard key={r.slug} recipe={r} />
                ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── CTA (varies by auth state) ────────────────────────────────────── */}
      {filtered.length > 0 && (
        <section className="px-4 pt-8 animate-fade-up">
          <div className="max-w-md mx-auto rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 text-center">
            {isAuthed ? (
              <>
                <Bookmark className="size-6 text-primary mx-auto mb-2" aria-hidden />
                <p className="font-bold">Lihat resep yang udah lo simpan</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  Bookmark, rating, dan review tersimpan rapi di satu tempat.
                </p>
                <Link
                  to="/resep/tersimpan"
                  className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Resep Tersimpan <ChevronRight className="size-4" />
                </Link>
              </>
            ) : (
              <>
                <Sparkles className="size-6 text-primary mx-auto mb-2" aria-hidden />
                <p className="font-bold">Belum nemu yang cocok?</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  Login dan pakai AI Coach untuk rekomendasi resep yang dipersonalisasi sesuai
                  profilmu.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Coba AI Coach <ChevronRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border/50 hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

function RecipeCard({ recipe }: { recipe: Awaited<ReturnType<typeof listSeoRecipes>>[number] }) {
  const onImgError = useImgFallback();
  return (
    <li>
      <Link
        to="/resep/$slug"
        params={{ slug: recipe.slug }}
        className="block h-full overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/40 transition group"
      >
        {recipe.image_url && (
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              loading="lazy"
              onError={onImgError}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
            />
          </div>
        )}
        <div className="p-4">
          {recipe.category && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[recipe.category] ?? recipe.category}
            </p>
          )}
          <h3 className="mt-1 font-semibold leading-tight line-clamp-2">{recipe.title}</h3>
          {recipe.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {recipe.calories != null && (
              <span className="font-semibold text-primary">{recipe.calories} kkal</span>
            )}
            {recipe.protein_g != null && <span>{recipe.protein_g}g protein</span>}
            {recipe.total_min != null && <span>{recipe.total_min} mnt</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="text-sm font-semibold">Tidak ada hasil</p>
      {query ? (
        <p className="text-xs text-muted-foreground mt-1">
          Coba kata kunci lain atau reset filter kategori.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">Belum ada resep di kategori ini.</p>
      )}
    </div>
  );
}
