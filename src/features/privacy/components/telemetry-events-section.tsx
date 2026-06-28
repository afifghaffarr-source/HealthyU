import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { getMyRecentTelemetryEvents } from "@/features/privacy/lib/telemetrySurface.functions";
import { Activity, Loader2, Inbox, Radar } from "lucide-react";

/**
 * Friendly INDONESIAN map for the telemetry events `track()` (Sprint 19)
 * writes into `error_reports`. Unknown events fall back to a neutral
 * chip — never throws on a brand-new event-type added by a future sprint.
 *
 * Ponytail: pulls ALL telemetry events through this same INDONESIAN
 * vocabulary. Adding a new event = ONE entry here. No new file.
 *
 * Reference: this is the read-side counterpart to Sprint 19's write-side.
 * Same privacy posture — user sees ONLY their own events.
 */
const LABEL_MAP: Record<string, string> = {
  "dashboard.meta_hero.viewed": "Lihat pola meta harian",
  "dashboard.digest.requested": "Minta ringkasan mingguan",
  "dashboard.badge_celebrated.seen": "Selamat badge baru",
  "privacy.vault.viewed": "Buka brankas privasi",
  "scan.warung.saved": "Catat menu warung",
  "barcode_grade.viewed": "Lihat grade barcode",
  "weekly_card.shared": "Bagikan kartu mingguan",
  "puasa_aman_widget.viewed": "Buka widget puasa aman",
  "sustainability.card.viewed": "Buka tracker sustainability",
};
const FALLBACK_LABEL = "Aktivitas sistem";

const opts = (limit: number) =>
  queryOptions({
    queryKey: ["privacy", "telemetry-events", limit],
    // Server fn via useServerFn — same pattern as AuditLogSection.
    queryFn: () => getMyRecentTelemetryEvents({ data: { limit } }),
    // Telemetry is high-frequency (every nav, every page mount). 5-min
    // stale is generous — the section is informational, not reactive.
    staleTime: 5 * 60 * 1000,
  });

/**
 * Sprint 33 — surfaces what `track()` writes (severity='info',
 * mechanism='telemetry') to the user inside the Privacy Vault so they
 * can see which app-side events were recorded about them. Lives below
 * the AuditLogSection.
 */
export function TelemetryEventsSection({
  limit = 10,
  className = "",
}: {
  limit?: number;
  className?: string;
}) {
  const fn = useServerFn(getMyRecentTelemetryEvents);
  const { data, isLoading } = useQuery({
    ...opts(limit),
    queryFn: () => fn({ data: { limit } }),
  });

  const events = data?.events ?? [];

  return (
    <section
      className={`p-4 rounded-lg border bg-card text-card-foreground ${className}`}
      aria-labelledby="telemetry-events-heading"
    >
      <div className="flex items-center gap-2 mb-2">
        <Radar className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="telemetry-events-heading" className="text-sm font-medium text-foreground">
          Aktivitas telemetry
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Daftar aktivitas aplikasi yang kami catat untuk memahami fitur mana yang paling sering
        dipakai. Tidak ada pesan atau data pribadi di sini — hanya nama aktivitas dan waktunya.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Memuat…
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="size-3.5" aria-hidden />
          Belum ada aktivitas tercatat.
        </div>
      )}

      <ul className="space-y-1.5" data-testid="telemetry-event-list">
        {events.slice(0, limit).map((e) => (
          <li
            key={e.id}
            className="flex items-baseline gap-2 text-xs rounded px-2 py-1 bg-secondary/40"
          >
            <Activity
              className="size-3 text-muted-foreground shrink-0 translate-y-0.5"
              aria-hidden
            />
            <span className="font-medium text-foreground">
              {LABEL_MAP[e.eventName] ?? FALLBACK_LABEL}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {formatRelativeTime(e.createdAt)}
            </span>
            {e.route && (
              <span className="font-mono text-[10px] text-muted-foreground/60 truncate">
                {e.route}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Tiny Indonesian relative-time formatter. Uses Date.now() so the output
 * is always relative to the moment of render. Falls back to absolute ISO
 * for items > 7 days old so we never lie about presence in the timeline.
 */
function formatRelativeTime(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffHour < 24 * 7) return `${Math.round(diffHour / 24)} hari lalu`;
  return iso.slice(0, 10); // YYYY-MM-DD — neutral, non-misleading
}
