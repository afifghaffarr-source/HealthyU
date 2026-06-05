import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { recommendRecipes } from "@/lib/scanExtras.functions";

const opts = queryOptions({ queryKey: ["recipe-recs"], queryFn: () => recommendRecipes() });

export const Route = createFileRoute("/_authenticated/recipes/recommendations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Rekomendasi Resep" showBack />
      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-4">
          <div className="text-xs text-muted-foreground">Sisa kalori hari ini</div>
          <div className="text-2xl font-bold text-primary">{Math.round(data.remaining)} kkal</div>
        </div>
        {data.recipes.length === 0 && (
          <div className="text-center text-muted-foreground py-12">Tidak ada resep yang cocok</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {data.recipes.map((r) => (
            <Link
              key={r.id}
              to="/recipes/$id"
              params={{ id: r.id }}
              className="rounded-2xl bg-card border overflow-hidden"
            >
              {r.image_url && (
                <img loading="lazy" decoding="async" src={r.image_url} alt="" className="w-full aspect-square object-cover" />
              )}
              <div className="p-2">
                <div className="text-xs font-medium line-clamp-2">{r.title}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {Math.round(Number(r.calories ?? 0))} kkal · {r.prep_min ?? "-"}m
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
