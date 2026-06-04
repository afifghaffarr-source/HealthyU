import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Info } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SearchChips } from "@/components/healthyu/search-chips";
import { useRecentSearch } from "@/hooks/use-recent-search";
import { BottomNav } from "@/components/bottom-nav";
import { browseFoods, getFoodDetail, getFoodFacets } from "@/lib/foodDb.functions";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { PullIndicator } from "@/components/healthyu/pull-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/foods")({
  component: FoodsPage,
});

function FoodsPage() {
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
          <FacetSelect label="Daerah" value={region} setValue={setRegion} options={facetData?.regions ?? []} />
          <FacetSelect label="Kategori" value={category} setValue={setCategory} options={facetData?.categories ?? []} />
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
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
        <FoodDetailSheet
          data={selected}
          loading={!selected}
          onClose={() => setSelectedId(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

function FacetSelect({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-16 text-muted-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-3 py-2 rounded-xl bg-muted/60 border border-transparent focus:border-primary outline-none text-sm"
      >
        <option value="">Semua</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

type DetailData = Awaited<ReturnType<typeof getFoodDetail>> | undefined;

function FoodDetailSheet({
  data,
  loading,
  onClose,
}: {
  data: DetailData;
  loading: boolean;
  onClose: () => void;
}) {
  const food = data?.food;
  const servings = data?.servings ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">{loading ? "Memuat..." : food?.name}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        {food && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {food.region ?? "—"} · {food.category ?? "—"}
              {food.subcategory ? ` · ${food.subcategory}` : ""}
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Kalori" value={Math.round(food.calories)} unit="kkal" />
              <Stat label="Protein" value={food.protein_g ?? 0} unit="g" />
              <Stat label="Karbo" value={food.carbs_g ?? 0} unit="g" />
              <Stat label="Lemak" value={food.fat_g ?? 0} unit="g" />
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Ukuran Porsi</p>
              <div className="space-y-1.5">
                {servings.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Default: {food.serving_size}
                    {food.serving_unit}
                  </p>
                )}
                {servings.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm px-3 py-2 rounded-lg bg-muted/50">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {s.grams}g · {Math.round((food.calories * Number(s.grams)) / Number(food.serving_size))} kkal
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(food.allergens?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">⚠️ Alergen</p>
                <div className="flex flex-wrap gap-1.5">
                  {food.allergens!.map((a: string) => (
                    <span key={a} className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(food.tags?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {food.tags!.map((t: string) => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              to="/food"
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              <Info className="size-4" /> Catat sebagai makanan
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-muted/50">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}