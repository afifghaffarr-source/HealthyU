import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { compareWeeks } from "@/lib/scanMore.functions";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const opts = queryOptions({ queryKey: ["compare-weeks"], queryFn: () => compareWeeks() });

export const Route = createFileRoute("/_authenticated/reports/compare")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Row({ label, now, prev, unit }: { label: string; now: number; prev: number; unit: string }) {
  const diff = now - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-warning" : diff < 0 ? "text-success" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-card border">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{Math.round(now)}{unit}</p>
        <p className="text-[10px] text-muted-foreground">minggu lalu: {Math.round(prev)}{unit}</p>
      </div>
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="size-4" />
        <span className="text-sm font-semibold">{pct > 0 ? "+" : ""}{pct}%</span>
      </div>
    </div>
  );
}

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Bandingkan Minggu" showBack />
      <main className="max-w-md mx-auto px-4 pt-2 space-y-2">
        <Row label="Kalori" now={data.thisWeek.cal} prev={data.lastWeek.cal} unit=" kkal" />
        <Row label="Protein" now={data.thisWeek.p} prev={data.lastWeek.p} unit="g" />
        <Row label="Karbo" now={data.thisWeek.c} prev={data.lastWeek.c} unit="g" />
        <Row label="Lemak" now={data.thisWeek.f} prev={data.lastWeek.f} unit="g" />
      </main>
      <BottomNav />
    </div>
  );
}