import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { hydrationMealPairing } from "@/lib/scanFinal.functions";
import { Droplet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/hydration")({
  component: Page,
});

function Page() {
  const fn = useServerFn(hydrationMealPairing);
  const { data } = useQuery({
    queryKey: ["hydration-meal"],
    queryFn: () => fn({ data: undefined as any }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Hidrasi vs Kalori" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Air diminum</span>
            <span className="font-bold">{data?.totalMl ?? 0} ml</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Kalori masuk</span>
            <span className="font-bold">{Math.round(data?.totalKcal ?? 0)} kkal</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Target air (≈1ml/kkal)</span>
            <span className="font-bold">{data?.recommendedMl ?? 0} ml</span>
          </div>
        </div>
        {data && data.gap > 0 && (
          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 text-sm inline-flex items-start gap-2">
            <Droplet className="size-5 text-blue-500 mt-0.5" />
            Masih kurang <b>&nbsp;{data.gap} ml&nbsp;</b> untuk menyeimbangkan asupan hari ini.
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}