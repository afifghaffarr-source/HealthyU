import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getWeightGoal } from "@/features/scan/lib/scanBatch9.functions";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

const WeightAreaChart = lazy(() => import("@/components/charts/weight-area-chart"));

export const Route = createFileRoute("/_authenticated/weight/chart")({ component: Page });

function Page() {
  const goalFn = useServerFn(getWeightGoal);
  const { data: goal } = useQuery({
    queryKey: ["weight-goal"],
    queryFn: () => goalFn({ data: undefined as never }),
  });
  const { data: logs } = useQuery({
    queryKey: ["weight-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .order("logged_at", { ascending: true })
        .limit(60);
      return (data ?? []).map((r) => ({ date: r.logged_at.slice(5, 10), kg: Number(r.weight_kg) }));
    },
  });
  const target = goal?.goal?.target_weight_kg ? Number(goal.goal.target_weight_kg) : undefined;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Grafik Berat" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-xl border bg-card p-3 h-64">
          <Suspense fallback={<div className="size-full animate-pulse rounded-lg bg-muted" />}>
            <WeightAreaChart data={logs ?? []} target={target} />
          </Suspense>
        </div>
        {goal?.prediction && (
          <p className="text-xs text-muted-foreground">
            Estimasi: {goal.prediction.estDate ?? "—"} • {goal.prediction.weeklyRate} kg/minggu
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
