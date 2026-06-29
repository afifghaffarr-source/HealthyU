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
import { useTranslation } from "@/lib/i18n";

export function FoodsPage() {
  const { t } = useTranslation();
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
  const [offset, setOffset] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allFoods, setAllFoods] = useState<any[]>([]);

  const { data: facetData } = useQuery({
    queryKey: ["food-facets"],
    queryFn: () => facets(),
    staleTime: 5 * 60_000,
  });

  const { data: foods = [], isFetching } = useQuery({
    queryKey: ["food-db", q, region, category, tag, excluded, offset],
    queryFn: () =>
      browse({
        data: {
          q,
          region: region || undefined,
          category: category || undefined,
          tag: tag || undefined,
          excludeAllergens: excluded,
          limit: 30,
          offset,
        },
      }),
  });

  // Accumulate foods when loading more

  useEffect(() => {
    if (offset === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
      setAllFoods(foods);
    } else {
      setAllFoods((prev) => [...prev, ...foods]);
    }
  }, [foods, offset]);

  // Reset pagination when filters change

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    setOffset(0);
    setAllFoods([]);
  }, [q, region, category, tag, excluded]);

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
        <TopAppBar title={t("foods.dbTitle")} showBack />
      </div>
      <div className="sticky top-[57px] z-20 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("foods.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {!q && recent.items.length > 0 && (
          <SearchChips
            label={t("foods.recentSearch")}
            items={recent.items}
            onPick={(t2) => setQ(t2)}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        )}
        <section className="space-y-3">
          <FacetSelect
            label={t("foods.region")}
            value={region}
            setValue={setRegion}
            options={facetData?.regions ?? []}
          />
          <FacetSelect
            label={t("foods.category")}
            value={category}
            setValue={setCategory}
            options={facetData?.categories ?? []}
          />
          <FacetSelect
            label={t("foods.tag")}
            value={tag}
            setValue={setTag}
            options={facetData?.tags ?? []}
          />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("foods.avoidAllergen")}
            </p>
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
            {isFetching && offset === 0
              ? t("common.searching")
              : t("foods.resultCount", { count: allFoods.length })}
            {activeFilters > 0 && ` · ${t("foods.filterCount", { count: activeFilters })}`}
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
              {t("foods.reset")}
            </button>
          )}
        </div>

        <ul className="space-y-2">
          {isFetching && allFoods.length === 0 && <ListSkeleton count={5} />}
          {allFoods.map((f) => (
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
                        {f.tags!.slice(0, 3).map((t2: string) => (
                          <span
                            key={t2}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {t2}
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
          {!isFetching && allFoods.length === 0 && (
            <li className="text-center text-sm text-muted-foreground py-8">
              {t("foods.noResults")}
            </li>
          )}
        </ul>

        {/* Load More Button */}
        {foods.length === 30 && !isFetching && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setOffset((prev) => prev + 30)}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition"
            >
              {t("foods.loadMore")}
            </button>
          </div>
        )}

        {isFetching && offset > 0 && (
          <div className="flex justify-center py-4">
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        )}
      </main>

      {selectedId && (
        <FoodDetailSheet data={selected} loading={!selected} onClose={() => setSelectedId(null)} />
      )}

      <BottomNav />
    </div>
  );
}
