import { useState } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

/**
 * Compact, non-blocking banner that surfaces offline state and any pending
 * queued logs (water, meals, weight, mood, vitals, workouts).
 * Sync button always visible. Dismissible.
 */
export function OfflineQueueBanner() {
  const { online, pending, sync } = useOfflineQueue();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl px-3 py-2.5 text-xs flex items-center gap-2 outline-1 bg-amber-50 dark:bg-amber-950/30 outline-amber-200/60 dark:outline-amber-900/40 text-amber-900 dark:text-amber-100"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        {!online && pending === 0 && "Kamu sedang offline. Catatan baru akan tersimpan lokal."}
        {!online &&
          pending > 0 &&
          `Offline · ${pending} catatan menunggu sinkron saat koneksi kembali.`}
        {online && pending > 0 && `${pending} catatan menunggu sinkron…`}
      </span>
      {pending > 0 && (
        <button
          type="button"
          onClick={() => void sync()}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-amber-200/60 dark:bg-amber-900/40 font-semibold"
          aria-label="Sinkron sekarang"
        >
          <RefreshCw className="size-3" aria-hidden /> Sync
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup notifikasi"
        className="shrink-0 inline-flex items-center text-xs text-muted-foreground/60 hover:text-muted-foreground ml-0.5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
