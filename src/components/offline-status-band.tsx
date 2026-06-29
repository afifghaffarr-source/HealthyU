/**
 * Offline status band — Sprint 23 Offline Diary Mode.
 *
 * Small "you're offline, N entries waiting to sync" pill that renders at the
 * top of viewport when:
 *   - navigator.onLine === false (offline)
 *   - OR there's 1+ meal/water record in Dexie with sync_status ≠ "synced"
 *
 * Why both:
 *   - "Offline" status alone doesn't tell user their queued writes are safe.
 *   - "Pending sync" alone dismisses the value of the offline-first pattern
 *     (user should know they're offline, not just slow).
 *
 * Positioning: sticky top-2 (below the OS/lock status bar but above app nav),
 * z-50 so it overlays content but not modal dialogs. Visible on every route
 * because the user could navigate during a disconnect.
 *
 * ponytail: 100% reuse.
 *   - Reuses existing supabase client.
 *   - Reuses existing pendingMealSyncCount from mealDexie.ts (Sprint 23).
 *   - Reuses existing pending water counter from waterDexie.ts.
 *   - Reuses existing startBackgroundSync() interval for live update.
 *   - No new tables, no new API calls.
 */

import { useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw, Trash2, Wifi, X } from "lucide-react";
import { pendingMealSyncCount } from "@/features/meals/lib/mealDexie";

const REFRESH_INTERVAL_MS = 30_000;

export function OfflineStatusBand() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true, // SSR (CF Workers have navigator but not onLine) defaults to online
  );
  const [pendingMeals, setPendingMeals] = useState<number>(0);
  const [pendingWaters, setPendingWaters] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Listen for browser online/offline events + passive ping fallback.
  // navigator.onLine can be unreliable in installed PWAs (SW interception).
  // We supplement with a periodic HEAD ping to the app origin as ground truth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Passive ping every 60s to verify real connectivity.
    // Uses no-cors to avoid preflight overhead — we only care about reachability.
    let cancelled = false;
    const ping = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5_000);
        await fetch("/favicon.ico", {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(t);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();
    const pingId = window.setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(pingId);
    };
  }, []);

  // Poll Dexie for pending counts. Cheap fire-and-forget.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const meals = await pendingMealSyncCount();
        if (cancelled) return;
        setPendingMeals(meals);
        // Water counter is a deferred read — we lazy-import to keep the
        // initial bundle small. The Sleep-Pattern reason: water offline is
        // already shipped and most users won't see this band often.
        const waterMod = await import("@/features/water/lib/waterDexie");
        const waters = await waterMod.pendingWaterSyncCount().catch(() => 0);
        if (cancelled) return;
        setPendingWaters(waters);
      } catch {
        // Degrade silently — band just shows "offline" without counts.
      }
    };
    void tick();
    const id = window.setInterval(tick, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const totalPending = pendingMeals + pendingWaters;
  const showOffline = !online;
  const showPersistent = totalPending > 0;

  // User can dismiss the band for this session
  if (dismissed) return null;
  if (!showOffline && !showPersistent) return null;

  const handleManualSync = async () => {
    if (typeof window === "undefined") return;
    setSyncing(true);
    try {
      const { syncMealLogs, syncWaterLogs } = await import("@/lib/dexie-sync");
      void syncWaterLogs();
      void syncMealLogs();
      await new Promise((r) => setTimeout(r, 1_500));
    } finally {
      setSyncing(false);
    }
  };

  // Sprint 35 — Bug C: purges rows that are in `sync_status = "error"`
  // AND older than 7 days. These are unrecoverable server-side rejections
  // and would otherwise keep the band visible forever.

  const handlePurgeStuck = async () => {
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "Hapus semua catatan yang gagal sync > 7 hari? Tindakan ini tidak bisa dibatalkan.",
      )
    ) {
      return;
    }
    setPurging(true);
    setPurgeMessage(null);
    try {
      const { purgeStuckSyncErrors } = await import("@/lib/dexie-sync");
      const result = await purgeStuckSyncErrors();
      const total = result.waterDeleted + result.mealDeleted;
      if (total === 0 && result.thrashedRejected === 0) {
        setPurgeMessage("Tidak ada catatan yang gagal.");
      } else if (total === 0) {
        setPurgeMessage("Tidak ada yang gagal sync > 7 hari.");
      } else {
        setPurgeMessage(
          `${total} catatan yang gagal dihapus${
            result.thrashedRejected > 0
              ? `. ${result.thrashedRejected} lagi masih recent — coba lagi besok.`
              : "."
          }`,
        );
      }
      // Optimistic re-fetch of pending counts so the band disappears
      // when totalPending drops to 0.
      const { pendingMealSyncCount: refreshMeals } = await import("@/features/meals/lib/mealDexie");
      const mealsNow = await refreshMeals().catch(() => 0);
      setPendingMeals(mealsNow);
    } finally {
      setPurging(false);
    }
  };

  // Always offer purge when there are pending entries — IndexedDB is local,
  // so stuck sync rows don't require network connectivity to delete.
  const offerPurge = totalPending > 0;

  return (
    <div
      data-testid="offline-status-band"
      data-online={online ? "yes" : "no"}
      data-pending={totalPending}
      className={`sticky top-2 z-50 mx-3 mt-2 rounded-xl border px-3 py-2 flex items-center gap-2 text-xs shadow-md ${
        showOffline
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-blue-50 border-blue-200 text-blue-900"
      }`}
      role="status"
      aria-live="polite"
    >
      {showOffline ? (
        <CloudOff className="size-4 shrink-0" aria-hidden />
      ) : (
        <Wifi className="size-4 shrink-0" aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        {showOffline ? (
          <span>
            Mode offline
            {totalPending > 0 && (
              <>
                {" · "}
                <strong>{totalPending}</strong> entry menunggu sinkronisasi
              </>
            )}
          </span>
        ) : (
          <span>
            {" "}
            <strong>{totalPending}</strong> entry menunggu sinkronisasi
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleManualSync}
        disabled={syncing}
        className="shrink-0 inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:no-underline disabled:opacity-60"
      >
        {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        Sync
      </button>
      {offerPurge && (
        <button
          type="button"
          onClick={handlePurgeStuck}
          disabled={purging}
          aria-label="Hapus catatan yang gagal sync lebih dari 7 hari"
          title="Hapus catatan yang gagal sync > 7 hari"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:no-underline disabled:opacity-60"
        >
          {purging ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          Hapus yang gagal
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup notifikasi"
        className="shrink-0 inline-flex items-center text-xs text-muted-foreground hover:text-foreground ml-0.5"
      >
        <X className="size-3.5" />
      </button>
      {purgeMessage && (
        <span
          role="status"
          aria-live="polite"
          className="basis-full text-[11px] text-muted-foreground mt-1"
        >
          {purgeMessage}
        </span>
      )}
    </div>
  );
}
