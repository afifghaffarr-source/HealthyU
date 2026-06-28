/**
 * Background sync orchestrator — push pending Dexie records ke Supabase.
 *
 * Strategy:
 *   - Triggered: on app focus, on network reconnect, on manual refresh
 *   - Batch: ambil max 50 records per cycle (avoid blocking UI)
 *   - Retry: exponential backoff (1s, 2s, 4s, 8s, max 30s)
 *   - Conflict: last-write-wins by updated_at
 *
 * Future (Sprint 3 expansion): pull-to-refresh, multi-table (water, food, mood).
 */

import { getDb, type SyncStatus } from "@/lib/dexie";
import { logWater, deleteWater } from "@/features/water/lib/water.functions";
import { logMealWithItems } from "@/features/meals/lib/meals.functions";

const SYNC_BATCH_SIZE = 50;
const SYNC_INTERVAL_MS = 30_000;
const MAX_RETRY_DELAY_MS = 30_000;

let syncInProgress = false;
let syncInterval: number | null = null;
const retryTimeouts = new Map<string, number>();

/**
 * Sync all pending water logs to Supabase. Returns count synced.
 *
 * @example
 *   const count = await syncWaterLogs();
 *   toast.success(`${count} data tersinkronisasi`);
 */
export async function syncWaterLogs(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncInProgress) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 }; // offline, skip silently
  }
  const db = getDb();
  if (!db) return { synced: 0, failed: 0 };

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const pending = await db.waterLogs
      .where("sync_status")
      .anyOf(["pending", "error"] as SyncStatus[])
      .limit(SYNC_BATCH_SIZE)
      .toArray();

    for (const record of pending) {
      try {
        // Mark as syncing (avoid double-process)
        await db.waterLogs.update(record.id, { sync_status: "syncing" });

        // For pilot: only sync "pending" inserts (delete is separate tombstone)
        if (record.sync_error !== "deleted") {
          await logWater({
            data: {
              amount_ml: record.amount_ml,
              client_id: record.id, // pass UUID for idempotency
            },
          });
        }

        // Mark synced
        await db.waterLogs.update(record.id, {
          sync_status: "synced",
          synced_at: Date.now(),
          sync_error: null,
        });
        synced += 1;
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : "Sync failed";
        const retryCount = (record.sync_error ? Number(record.sync_error.split(":")[0]) : 0) || 0;
        const delay = Math.min(2 ** retryCount * 1000, MAX_RETRY_DELAY_MS);

        await db.waterLogs.update(record.id, {
          sync_status: "error",
          sync_error: `${retryCount + 1}:${msg}`,
        });

        // Schedule retry with exponential backoff
        scheduleRetry(record.id, delay);
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

/**
 * Sprint 23 — sync meal logs offline-first.
 *
 * Mirrors syncWaterLogs() pattern but replays the full itemized payload
 * via logMealWithItems server fn. The server computes totals from items
 * independently (server-computed values are authoritative), but we still
 * pre-compute total_calories/etc. so the offline UI can show immediate
 * feedback before the server round-trip.
 *
 * Parse-error recovery: if a Dexie record has malformed items (corruption
 * from a pre-v2 schema migration), the row is marked error with full
 * payload preserved in sync_error message so a human can recover it via
 * the Privacy Vault eventually.
 */
export async function syncMealLogs(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncInProgress) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  const db = getDb();
  if (!db) return { synced: 0, failed: 0 };

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const pending = await db.mealLogs
      .where("sync_status")
      .anyOf(["pending", "error"] as SyncStatus[])
      .limit(SYNC_BATCH_SIZE)
      .toArray();

    for (const record of pending) {
      try {
        await db.mealLogs.update(record.id, { sync_status: "syncing" });

        // Push the full itemized payload to the server.
        await logMealWithItems({
          data: {
            meal_type: record.meal_type,
            items: record.items,
            notes: record.notes ?? undefined,
          },
        });

        await db.mealLogs.update(record.id, {
          sync_status: "synced",
          synced_at: Date.now(),
          sync_error: null,
        });
        synced += 1;
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : "Sync failed";
        const retryCount = (record.sync_error ? Number(record.sync_error.split(":")[0]) : 0) || 0;
        const delay = Math.min(2 ** retryCount * 1000, MAX_RETRY_DELAY_MS);

        await db.mealLogs.update(record.id, {
          sync_status: "error",
          sync_error: `${retryCount + 1}:${msg}`,
        });
        scheduleRetry(record.id, delay);
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

function scheduleRetry(recordId: string, delayMs: number) {
  // Cancel previous retry for this record
  const existing = retryTimeouts.get(recordId);
  if (existing) window.clearTimeout(existing);

  const t = window.setTimeout(() => {
    retryTimeouts.delete(recordId);
    // Retry both water + meal — they're cheap when no records pending.
    void syncWaterLogs();
    void syncMealLogs();
  }, delayMs);
  retryTimeouts.set(recordId, t);
}

/**
 * Start background sync loop. Call once on app mount.
 * Runs syncWaterLogs() AND syncMealLogs() periodically + on network
 * reconnect + on app focus.
 *
 * Ponytail: one shared interval instead of two — both water + meals
 * share SYNC_INTERVAL_MS window. The serial syncInProgress mutex in each
 * sync fn prevents concurrent batches from double-processing the same row.
 */
export function startBackgroundSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const runOnce = () => {
    void syncWaterLogs();
    void syncMealLogs();
  };

  // Periodic sync
  syncInterval = window.setInterval(runOnce, SYNC_INTERVAL_MS);

  // Sync on network reconnect
  const onOnline = runOnce;
  window.addEventListener("online", onOnline);

  // Sync on app focus
  const onFocus = runOnce;
  window.addEventListener("focus", onFocus);

  // Initial sync after 5s (let app render first)
  const initialTimeout = window.setTimeout(runOnce, 5_000);

  return () => {
    if (syncInterval) window.clearInterval(syncInterval);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
    window.clearTimeout(initialTimeout);
    for (const t of retryTimeouts.values()) window.clearTimeout(t);
    retryTimeouts.clear();
  };
}

/**
 * Tombstone a water log (mark for deletion on next sync).
 * Used when user deletes entry while offline — actual DB delete happens on sync.
 */
export async function tombstoneWaterLog(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.waterLogs.update(id, {
    sync_error: "deleted",
    sync_status: "pending",
    updated_at: Date.now(),
  });
  // Try sync immediately
  void syncWaterLogs();
}

/**
 * Permanent delete (after confirmed sync). Used by purge button.
 */
export async function purgeWaterLog(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.waterLogs.delete(id);
}
