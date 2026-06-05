import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getWeeklyNutrition } from "@/features/scan/lib/scanExtras.functions";

const opts = queryOptions({ queryKey: ["weekly-nutrition"], queryFn: () => getWeeklyNutrition() });

export const Route = createFileRoute("/_authenticated/reports/nutrition")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const max = Math.max(1, ...data.days.map((d) => d.cal));
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Tren Nutrisi 7 Hari" showBack />
      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4">
          <div className="text-sm font-medium mb-3">Kalori per hari</div>
          <div className="flex items-end justify-between gap-1 h-40">
            {data.days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] tabular-nums">{Math.round(d.cal)}</div>
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${(d.cal / max) * 100}%` }}
                />
                <div className="text-[10px] text-muted-foreground">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="text-sm font-medium">Makronutrien</div>
          {data.days.map((d) => (
            <div
              key={d.date}
              className="text-xs flex justify-between border-b py-1.5 last:border-0"
            >
              <span className="text-muted-foreground">{d.date}</span>
              <span>
                P {Math.round(d.p)}g · K {Math.round(d.c)}g · L {Math.round(d.f)}g
              </span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
