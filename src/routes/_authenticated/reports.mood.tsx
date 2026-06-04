import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { moodMealCorrelation } from "@/lib/scanFinal.functions";

export const Route = createFileRoute("/_authenticated/reports/mood")({
  component: Page,
});

function Page() {
  const fn = useServerFn(moodMealCorrelation);
  const { data } = useQuery({
    queryKey: ["mood-meal"],
    queryFn: () => fn({ data: undefined as any }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Mood × Meal" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Korelasi 30 hari antara mood, kalori, dan gula.
        </p>
        {data?.points.map((p) => (
          <div
            key={p.date}
            className="rounded-xl bg-card border p-3 flex items-center justify-between text-sm"
          >
            <span className="font-medium">{p.date}</span>
            <span>{"😣😕😐🙂😄"[(p.mood ?? 3) - 1]}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(p.kcal)} kkal · {Math.round(p.sugar)}g gula
            </span>
          </div>
        ))}
        {data?.points.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada data mood</p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
