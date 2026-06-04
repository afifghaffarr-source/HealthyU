import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateBudgetMealPlan } from "@/lib/scanBatch11.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mealplan/budget")({ component: Page });

function Page() {
  const fn = useServerFn(generateBudgetMealPlan);
  const [budget, setBudget] = useState(300000);
  const [days, setDays] = useState(7);
  const mut = useMutation({
    mutationFn: () => fn({ data: { budgetIdr: budget, days } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const plan = useMemo(() => {
    try {
      return mut.data?.planJson ? JSON.parse(mut.data.planJson) : null;
    } catch {
      return null;
    }
  }, [mut.data]);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Meal Plan Budget" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <label className="text-sm">Budget total (Rp)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <label className="text-sm">Berapa hari</label>
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            {mut.isPending ? "AI menyusun…" : "Generate Plan"}
          </button>
        </div>
        {plan?.days && (
          <div className="space-y-3">
            {plan.days.map((d: any, i: number) => (
              <div key={i} className="rounded-2xl bg-card border p-3 space-y-1 text-sm">
                <div className="font-semibold">Hari {d.day ?? i + 1}</div>
                {(d.meals ?? []).map((m: any, j: number) => (
                  <div key={j} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground">
                      Rp{m.est_idr} · {m.calories}kcal
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
