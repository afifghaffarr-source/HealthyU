import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listScanHistory } from "@/lib/scanHistory.functions";
import { Camera } from "lucide-react";

const opts = queryOptions({ queryKey: ["scan-history"], queryFn: () => listScanHistory() });

export const Route = createFileRoute("/_authenticated/scan/history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

type ScanItem = { name?: string; calories?: number };

function Page() {
  const { data } = useSuspenseQuery(opts);
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
            <Link
              key={s.id}
              to="/scan"
              className="block rounded-2xl bg-card border p-3 hover:bg-accent transition"
            >
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
            </Link>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}