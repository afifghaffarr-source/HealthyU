import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getSleepMealCorrelation } from "@/lib/scanSocial.functions";
import { Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/sleep-meal")({
  component: Page,
});

function Page() {
  const fn = useServerFn(getSleepMealCorrelation);
  const { data } = useQuery({
    queryKey: ["sleep-meal"],
    queryFn: () => fn({ data: undefined as any }),
  });
  const max = Math.max(1, ...(data?.points ?? []).map((p) => p.calories));
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Sleep × Meal" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">14 hari terakhir</p>
        {data?.points.map((p) => (
          <div key={p.date} className="rounded-xl bg-card border p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{p.date}</span>
              <span className="inline-flex items-center gap-1">
                <Moon className="size-3" /> {p.sleepHours.toFixed(1)}j · {Math.round(p.calories)}{" "}
                kkal
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${(p.calories / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
