import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { getTelemetryTimeline } from "@/features/privacy/lib/telemetrySurface.functions";
import { TrendingUp, Loader2, Inbox } from "lucide-react";

const opts = queryOptions({
  queryKey: ["privacy", "telemetry-timeline"],
  queryFn: () => getTelemetryTimeline(),
  staleTime: 5 * 60 * 1000,
});

/** Sprint 43: time-series sparkline bar chart — ponytail, CSS-only */
export function TelemetryTimelineChart({ className = "" }: { className?: string }) {
  const fn = useServerFn(getTelemetryTimeline);
  const { data, isLoading } = useQuery({
    ...opts,
    queryFn: () => fn(),
  });

  const points = data?.points ?? [];

  if (isLoading) {
    return (
      <section
        className={`p-4 rounded-lg border bg-card flex items-center gap-2 text-xs text-muted-foreground ${className}`}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Memuat grafik…
      </section>
    );
  }

  if (points.length === 0) {
    return (
      <section className={`p-4 rounded-lg border bg-card ${className}`}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="size-3.5" aria-hidden />
          Belum ada data untuk ditampilkan.
        </div>
      </section>
    );
  }

  const max = Math.max(...points.map((p) => p.total), 1);

  return (
    <section
      className={`p-4 rounded-lg border bg-card ${className}`}
      aria-labelledby="timeline-chart-heading"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="timeline-chart-heading" className="text-sm font-medium">
          Aktivitas harian (30 hari)
        </h2>
      </div>
      <div className="flex items-end gap-px h-24">
        {points.map((p) => (
          <div
            key={p.date}
            className="flex-1 flex flex-col items-center group relative"
            title={`${p.date}: ${p.total} aktivitas`}
          >
            <div
              className="w-full bg-primary/50 rounded-t hover:bg-primary/70 transition-colors"
              style={{ height: `${Math.max((p.total / max) * 100, 4)}%` }}
            />
            <span className="text-[9px] text-muted-foreground/50 mt-1 rotate-90 origin-left translate-x-2 translate-y-4 whitespace-nowrap hidden group-hover:block absolute top-full">
              {p.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground/50">{points[0].date}</span>
        <span className="text-[9px] text-muted-foreground/50">
          {points[points.length - 1].date}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Total: {points.reduce((s, p) => s + p.total, 0)} aktivitas dalam 30 hari
      </p>
    </section>
  );
}
