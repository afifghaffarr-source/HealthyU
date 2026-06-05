import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { reverseCalorie } from "@/features/scan/lib/scanSocial.functions";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reverse-calorie")({
  component: Page,
});

function Page() {
  const [kcal, setKcal] = useState(500);
  const fn = useServerFn(reverseCalorie);
  const mut = useMutation({
    mutationFn: () => fn({ data: { targetCalories: kcal } }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Cari Menu by Kalori" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-3">
          <label className="text-sm font-medium">Target kalori</label>
          <input
            type="number"
            value={kcal}
            onChange={(e) => setKcal(Number(e.target.value))}
            className="w-full rounded-xl border bg-background px-3 py-2"
            min={50}
            max={3000}
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2"
          >
            {mut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}{" "}
            Cari
          </button>
        </div>
        {mut.data?.suggestions?.map((s, i) => (
          <div key={i} className="rounded-2xl bg-card border p-4">
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-muted-foreground mb-2">
              {s.calories} kkal · P{s.protein_g}g · K{s.carbs_g}g · L{s.fat_g}g
            </div>
            <p className="text-sm">{s.why}</p>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
