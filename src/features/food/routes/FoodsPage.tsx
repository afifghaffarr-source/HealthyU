import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SearchChips } from "@/components/healthyu/search-chips";
import { useRecentSearch } from "@/hooks/use-recent-search";
import { BottomNav } from "@/components/bottom-nav";
import { browseFoods, getFoodDetail, getFoodFacets } from "@/features/food/lib/foodDb.functions";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { FacetSelect, FoodDetailSheet } from "@/features/food/components/FoodsPagePieces";

export function FoodsPage() {
  const browse = useServerFn(browseFoods);
  const facets = useServerFn(getFoodFacets);
  const detail = useServerFn(getFoodDetail);
  const qc = useQueryClient();
  const { pulling, refreshing } = usePullToRefresh(async () => {
    await qc.invalidateQueries({ queryKey: ["food-db"] });
    await qc.invalidateQueries({ queryKey: ["food-facets"] });
  });

  const [q, setQ] = useState("");
  const recent = useRecentSearch("foods");
  const pushTimer = useRef<number | null>(null);
  useEffect(() => {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    if (q.trim().length >= 2) {
      pushTimer.current = window.setTimeout(() => recent.push(q), 900);
    }
    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [q, recent]);
  const [region, setRegion] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: facetData } = useQuery({
    queryKey: ["food-facets"],
    queryFn: () => facets(),
    staleTime: 5 * 60_000,
  });

  const { data: foods = [], isFetching } = useQuery({
    queryKey: ["food-db", q, region, category, tag, excluded],
    queryFn: () =>
      browse({
        data: {
          q,
          region: region || undefined,
          category: category || undefined,
          tag: tag || undefined,
          excludeAllergens: excluded,
        },
      }),
  });

  const { data: selected } = useQuery({
    queryKey: ["food-detail", selectedId],
    queryFn: () => detail({ data: { id: selectedId as string } }),
    enabled: !!selectedId,
  });

  const toggleAllergen = (a: string) =>
    setExcluded((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const activeFilters = useMemo(
    () => [region, category, tag, ...excluded].filter(Boolean).length,
    [region, category, tag, excluded],
  );

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PullIndicator pulling={pulling} refreshing={refreshing} />
      <div className="max-w-md mx-auto px-4">
        <TopAppBar title="Database Makanan" showBack />
      </div>
      <div className="sticky top-[57px] z-20 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nasi, ayam, sate..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {!q && recent.items.length > 0 && (
          <SearchChips
            label="Pencarian terakhir"
            items={recent.items}
            onPick={(t) => setQ(t)}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        )}
        <section className="space-y-3">
          <FacetSelect
            label="Daerah"
            value={region}
            setValue={setRegion}
            options={facetData?.regions ?? []}
          />
          <FacetSelect
            label="Kategori"
            value={category}
            setValue={setCategory}
            options={facetData?.categories ?? []}
          />
          <FacetSelect label="Tag" value={tag} setValue={setTag} options={facetData?.tags ?? []} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Hindari alergen</p>
            <div className="flex flex-wrap gap-2">
              {(facetData?.allergens ?? []).map((a) => {
                const on = excluded.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAllergen(a)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      on
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : "bg-muted/60 border-transparent text-muted-foreground"
                    }`}
                  >
                    {on ? "✕ " : ""}
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isFetching ? "Mencari..." : `${foods.length} makanan`}
            {activeFilters > 0 && ` · ${activeFilters} filter`}
          </span>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setRegion("");
                setCategory("");
                setTag("");
                setExcluded([]);
              }}
              className="text-primary font-medium"
            >
              Reset
            </button>
          )}
        </div>

        <ul className="space-y-2">
          {isFetching && foods.length === 0 && <ListSkeleton count={5} />}
          {foods.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setSelectedId(f.id)}
                className="w-full text-left p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.region ?? "—"} · {f.category ?? "—"}
                    </p>
                    {(f.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {f.tags!.slice(0, 3).map((t: string) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-sm">{Math.round(f.calories)}</p>
                    <p className="text-[10px] text-muted-foreground">kkal</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
          {!isFetching && foods.length === 0 && (
            <li className="text-center text-sm text-muted-foreground py-8">Tidak ada hasil.</li>
          )}
        </ul>
      </main>

      {selectedId && (
        <FoodDetailSheet data={selected} loading={!selected} onClose={() => setSelectedId(null)} />
      )}

      <BottomNav />
    </div>
  );
}
