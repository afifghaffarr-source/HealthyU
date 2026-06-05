import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getWeightGoal, setWeightGoal } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/weight/goal")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const getFn = useServerFn(getWeightGoal);
  const setFn = useServerFn(setWeightGoal);
  const { data } = useQuery({
    queryKey: ["weight-goal"],
    queryFn: () => getFn({ data: undefined as never }),
  });
  const [s, setS] = useState("");
  const [t, setT] = useState("");
  const [d, setD] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      setFn({ data: { startWeightKg: Number(s), targetWeightKg: Number(t), targetDate: d } }),
    onSuccess: () => {
      toast.success("Goal tersimpan");
      qc.invalidateQueries({ queryKey: ["weight-goal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  type Goal = { start_weight_kg: number; target_weight_kg: number; target_date: string };
  type Prediction = { estDate: string | null; weeklyRate: number };
  const g = data?.goal as Goal | undefined;
  const p = data?.prediction as Prediction | undefined;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Weight Goal" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {g && (
          <div className="rounded-2xl bg-card border p-4 space-y-1 text-sm">
            <div>
              <b>Start:</b> {g.start_weight_kg} kg
            </div>
            <div>
              <b>Target:</b> {g.target_weight_kg} kg pada {g.target_date}
            </div>
            {p && (
              <div className="text-muted-foreground pt-2">
                Estimasi: {p.estDate ?? "—"} (rate {p.weeklyRate}kg/minggu)
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <input
            value={s}
            onChange={(e) => setS(e.target.value)}
            type="number"
            placeholder="Berat awal (kg)"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            type="number"
            placeholder="Berat target (kg)"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <input
            value={d}
            onChange={(e) => setD(e.target.value)}
            type="date"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={!s || !t || !d}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Simpan Goal
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
