import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { recommendExercises } from "@/lib/scanBatch10.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exercises/recommend")({ component: Page });

function Page() {
  const fn = useServerFn(recommendExercises);
  const [goal, setGoal] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { goal } }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Rekomendasi Latihan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="cth: turun BB 5kg dalam 2 bulan"
          className="w-full px-3 py-2 rounded-xl border bg-card"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!goal || mut.isPending}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
        >
          {mut.isPending ? "AI menyusun…" : "Generate"}
        </button>
        <div className="space-y-2">
          {(mut.data?.plan ?? []).map((p, i) => (
            <div key={i} className="rounded-xl bg-card border p-3 text-sm space-y-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.sets} set × {p.reps}
              </div>
              <p>{p.rationale}</p>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
