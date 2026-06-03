import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listScanHistory } from "@/lib/scanHistory.functions";
import { relogMeal } from "@/lib/scanExtras.functions";
import { Camera, RotateCw } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["scan-history"], queryFn: () => listScanHistory() });

export const Route = createFileRoute("/_authenticated/scan/history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

type ScanItem = { name?: string; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; portion_g?: number };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const relog = useServerFn(relogMeal);
  const relogMut = useMutation({
    mutationFn: (it: ScanItem) => relog({
      data: {
        name: it.name ?? "Makanan",
        calories: Number(it.calories ?? 0),
        protein_g: Number(it.protein_g ?? 0),
        carbs_g: Number(it.carbs_g ?? 0),
        fat_g: Number(it.fat_g ?? 0),
        meal_type: "snack",
        portion_g: Number(it.portion_g ?? 0) || undefined,
      },
    }),
    onSuccess: () => { toast.success("Dicatat ulang"); qc.invalidateQueries({ queryKey: ["scan-history"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Riwayat Scan" />
      <div className="p-4 space-y-2">
        {data.scans.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Camera className="mx-auto h-10 w-10 opacity-40 mb-2" />
            Belum ada scan
          </div>
        )}
        {data.scans.map((s) => {
          const items = (s.detected_foods as ScanItem[] | null) ?? [];
          const names = items.map((i) => i?.name).filter(Boolean).slice(0, 3).join(", ");
          return (
            <div key={s.id} className="rounded-2xl bg-card border p-3">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{names || "Tidak ada item"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at!).toLocaleString("id-ID")} ·{" "}
                    {Math.round(Number(s.avg_confidence ?? 0) * 100)}% · {s.model_version}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{Math.round(Number(s.total_calories ?? 0))} kkal</div>
                  {s.was_logged && <div className="text-xs text-success">✓ tercatat</div>}
                </div>
              </div>
              {items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {items.slice(0, 4).map((it, i) => (
                    <button
                      key={i}
                      onClick={() => relogMut.mutate(it)}
                      disabled={relogMut.isPending}
                      className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RotateCw className="size-3" /> {it.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}