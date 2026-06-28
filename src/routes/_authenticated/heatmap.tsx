import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getMealHeatmap } from "@/features/scan/lib/scanBatch7.functions";

export const Route = createFileRoute("/_authenticated/heatmap")({ component: Page });

function Page() {
  const fn = useServerFn(getMealHeatmap);
  const { data } = useQuery({
    queryKey: ["meal-heatmap"],
    queryFn: () => fn({ data: undefined as never }),
  });
  const counts = data?.counts ?? {};
  const days: Array<{ date: string; n: number }> = [];
  for (let i = 364; i >= 0; i--) {
    // eslint-disable-next-line react-hooks/purity -- wall-clock / non-deterministic browser API; re-renders deliberately driven by interval/timer or event subscription
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, n: counts[d] ?? 0 });
  }
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Heatmap Tahunan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-0.5">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.n} meal`}
              className="aspect-square rounded-sm"
              style={{
                backgroundColor:
                  d.n === 0
                    ? "hsl(var(--muted))"
                    : `oklch(0.7 0.15 145 / ${0.2 + (d.n / max) * 0.8})`,
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">365 hari terakhir</p>
      </main>
      <BottomNav />
    </div>
  );
}
