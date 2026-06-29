import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { getTelemetryEventCounts } from "@/features/privacy/lib/telemetrySurface.functions";
import { BarChart3, Loader2 } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  "dashboard.meta_hero.viewed": "Pola meta",
  "dashboard.digest.requested": "Minta ringkasan",
  "dashboard.badge_celebrated.seen": "Badge baru",
  "privacy.vault.viewed": "Brankas privasi",
  "scan.warung.saved": "Catat warung",
  "scan.warung.dexie_local_save_failed": "Gagal simpan",
  "barcode_grade.viewed": "Grade barcode",
  "weekly_card.shared": "Bagikan kartu",
  "puasa_aman_widget.viewed": "Puasa aman",
  "sustainability.card.viewed": "Sustainability",
};

const FALLBACK = "Lainnya";

function shortLabel(name: string): string {
  return LABEL_MAP[name] ?? name.split(".").pop() ?? FALLBACK;
}

const opts = queryOptions({
  queryKey: ["privacy", "telemetry-event-counts"],
  queryFn: () => getTelemetryEventCounts(),
  staleTime: 5 * 60 * 1000,
});

/** Sprint 42: CSS-only horizontal bar chart — ponytail, 0 deps */
export function TelemetryChart({ className = "" }: { className?: string }) {
  const fn = useServerFn(getTelemetryEventCounts);
  const { data, isLoading } = useQuery({
    ...opts,
    queryFn: () => fn(),
  });

  const events = data?.events ?? [];

  if (isLoading) {
    return (
      <div
        className={`p-4 rounded-lg border bg-card flex items-center gap-2 text-xs text-muted-foreground ${className}`}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Memuat grafik…
      </div>
    );
  }

  if (events.length === 0) return null;

  const max = events[0]?.count ?? 1;

  return (
    <section
      className={`p-4 rounded-lg border bg-card ${className}`}
      aria-labelledby="telemetry-chart-heading"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="telemetry-chart-heading" className="text-sm font-medium">
          Grafik aktivitas
        </h2>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.eventName} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate text-right">
              {shortLabel(e.eventName)}
            </span>
            <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${Math.max((e.count / max) * 100, 4)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground w-7 text-right shrink-0">
              {e.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
