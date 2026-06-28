import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { getMyRecentAuditLog } from "@/features/privacy/lib/pdpRights.functions";
import { Activity, Loader2, Inbox } from "lucide-react";

/**
 * Friendly map of audit_log.action → Indonesian label + tone color.
 * Unknown actions fall back to a neutral chip so we never crash on a
 * brand-new event type the backend added before we taught the UI.
 *
 * `tone` is a Tailwind utility class group: bg + text + border that we
 * surface directly. Keep the palette quiet (no harsh red) — audit log
 * is informational, not alarmist.
 */
type Tone = "neutral" | "info" | "privacy" | "security";
const LABEL_MAP: Record<string, { label: string; tone: Tone }> = {
  "pdp.export": { label: "Ekspor data", tone: "info" },
  "pdp.delete": { label: "Permintaan hapus akun", tone: "privacy" },
  "account.deletion_cancelled": { label: "Pembatalan hapus akun", tone: "neutral" },
  "chat.pii.detected": { label: "PII terdeteksi di chat", tone: "privacy" },
  "chat.pii.redacted": { label: "PII disensor sebelum AI", tone: "privacy" },
  "chat.image.blocked": { label: "Gambar chat diblokir", tone: "security" },
  "chat.safety.blocked": { label: "Pesan chat diblokir (safety)", tone: "security" },
  "chat.safety.crisis": { label: "Krisis terdeteksi → IGDA", tone: "security" },
  "chat.safety.ed_disclosure": { label: "Disclosure ED di chat", tone: "privacy" },
  "auth.login": { label: "Login", tone: "info" },
  "auth.logout": { label: "Logout", tone: "neutral" },
  "auth.signup": { label: "Signup", tone: "info" },
};
const FALLBACK_LABEL = "Aktivitas sistem";
const FALLBACK_TONE: Tone = "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border/60",
  info: "bg-primary/10 text-primary border-primary/20",
  privacy: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  security: "bg-amber-500/10 text-amber-800 border-amber-500/20",
};

const opts = (limit: number) =>
  queryOptions({
    queryKey: ["privacy", "audit-log", limit],
    queryFn: () => getMyRecentAuditLog({ data: { limit } }),
    // Audit log is mostly stable for the user; short stale window = good UX.
    staleTime: 60_000,
  });

/**
 * Renders the most-recent N audit_log rows for the current user.
 * Lives below the privacy toggles in /profile/privacy.
 */
export function AuditLogSection({
  limit = 10,
  className = "",
}: {
  limit?: number;
  className?: string;
}) {
  const fn = useServerFn(getMyRecentAuditLog);
  const qc = useQuery(opts(limit));

  // TanStack Query hooks return a stable shape; never undefined.
  const events = (qc.data?.events ?? []) as Array<{
    id: number;
    action: string;
    entity: string | null;
    entity_id: string | null;
    meta: unknown;
    ip_address: string | null;
    created_at: string;
  }>;

  return (
    <div className={`rounded-2xl bg-card border p-4 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
          <Activity className="size-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm flex items-center gap-2">
            Aktivitas akun terbaru
            {qc.isFetching && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Riwayat singkat apa yang sistem catat tentang akun Anda. Tidak termasuk PII pesan —
            hanya label aksi dan waktu.
          </div>
        </div>
      </div>

      {qc.isError ? (
        <div className="text-xs text-destructive">
          Gagal memuat audit log: {(qc.error as Error).message}
          <button
            type="button"
            onClick={() => qc.refetch()}
            className="ml-2 underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      ) : events.length === 0 && !qc.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Inbox className="size-4" />
          Belum ada aktivitas tercatat.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => {
            const meta = LABEL_MAP[e.action] ?? {
              label: FALLBACK_LABEL,
              tone: FALLBACK_TONE,
            };
            return (
              <li
                key={e.id}
                className="rounded-xl bg-muted/30 border border-border/50 px-3 py-2 flex items-start gap-2.5"
              >
                <span
                  className={`shrink-0 mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${TONE_CLASSES[meta.tone]}`}
                >
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {new Date(e.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {e.entity && (
                      <>
                        {" · "}
                        <span className="font-mono">{e.entity}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
