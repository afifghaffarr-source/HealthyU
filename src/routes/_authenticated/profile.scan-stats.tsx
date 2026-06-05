import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getScanStats } from "@/features/scan/lib/scanHistory.functions";

const opts = queryOptions({ queryKey: ["scan-stats"], queryFn: () => getScanStats() });

export const Route = createFileRoute("/_authenticated/profile/scan-stats")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Statistik Scan AI" />
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Total scan" value={String(data.total)} />
          <Tile label="Avg confidence" value={`${Math.round(data.avgConfidence * 100)}%`} />
          <Tile label="Avg waktu" value={`${Math.round(data.avgMs)} ms`} />
          <Tile label="Tercatat" value={`${Math.round(data.loggedRate * 100)}%`} />
        </div>
        <div className="rounded-2xl bg-card border p-4">
          <div className="text-sm font-medium mb-2">Penggunaan model</div>
          {Object.entries(data.byModel).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{k}</span>
              <span>{v}×</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
