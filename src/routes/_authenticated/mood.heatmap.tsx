import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getMoodHeatmap } from "@/features/scan/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/mood/heatmap")({ component: Page });

function Page() {
  const fn = useServerFn(getMoodHeatmap);
  const { data } = useQuery({
    queryKey: ["mood-heat"],
    queryFn: () => fn({ data: undefined as never }),
  });
  const map = new Map((data?.days ?? []).map((d) => [d.date, d.avg]));
  const days: Array<{ date: string; avg?: number }> = [];
  for (let i = 364; i >= 0; i--) {
    // eslint-disable-next-line react-hooks/purity -- wall-clock / non-deterministic browser API; re-renders deliberately driven by interval/timer or event subscription
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, avg: map.get(d) });
  }
  const color = (v?: number) =>
    v == null
      ? "bg-muted"
      : v >= 4
        ? "bg-primary"
        : v >= 3
          ? "bg-primary/70"
          : v >= 2
            ? "bg-primary/40"
            : "bg-primary/20";
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Mood Heatmap Tahunan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[2px]">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.avg?.toFixed(1) ?? "-"}`}
              className={`aspect-square rounded-sm ${color(d.avg)}`}
            />
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
