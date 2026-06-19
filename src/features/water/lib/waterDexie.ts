/**
 * Water tracker offline-first API (Dexie + sync).
 *
 * Pattern:
 *   - UI calls addWater() → instantly writes to IndexedDB → fires sync
 *   - Query (todaysWaterLocal) reads from IndexedDB → sub-10ms
 *   - Background sync push pending records to Supabase when online
 *
 * Why this design?
 *   - User sees instant feedback (no network round-trip)
 *   - Works on airplane mode / spotty 3G
 *   - No data loss: write always succeeds locally first
 */

import { getDb, uuid, type OfflineWaterLog } from "@/lib/dexie";
import { syncWaterLogs, tombstoneWaterLog } from "@/lib/dexie-sync";

export interface AddWaterInput {
  amount_ml: number;
  user_id: string;
  source?: OfflineWaterLog["source"];
  note?: string | null;
  /** Optional: when user drank (default = now). */
  logged_at?: number;
}

export interface AddWaterResult {
  id: string;
  /** True kalau immediate local write, false kalau queued for sync. */
  synced: boolean;
}

/**
 * Add water log entry — offline-first.
 * Writes to Dexie immediately, triggers background sync.
 */
export async function addWater(input: AddWaterInput): Promise<AddWaterResult> {
  const db = getDb();
  if (!db) throw new Error("IndexedDB unavailable (SSR?)");

  const id = uuid();
  const now = Date.now();
  const record: OfflineWaterLog = {
    id,
    user_id: input.user_id,
    amount_ml: input.amount_ml,
    source: input.source ?? "manual",
    note: input.note ?? null,
    logged_at: input.logged_at ?? now,
    created_at: now,
    updated_at: now,
    synced_at: null,
    sync_status: "pending",
    sync_error: null,
  };
  await db.waterLogs.add(record);
  // Fire-and-forget sync (don't block UI)
  void syncWaterLogs();

  return { id, synced: false };
}

/**
 * Read today's total water (from Dexie, includes pending unsynced).
 */
export async function todaysWaterLocal(userId: string): Promise<{
  total_ml: number;
  entries: OfflineWaterLog[];
  pending_count: number;
}> {
  const db = getDb();
  if (!db) return { total_ml: 0, entries: [], pending_count: 0 };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const entries = await db.waterLogs
    .where("[user_id+logged_at]")
    .between([userId, dayStart.getTime()], [userId, dayEnd.getTime()])
    .filter((r) => r.sync_error !== "deleted") // exclude tombstoned
    .reverse()
    .sortBy("logged_at");

  const total_ml = entries.reduce((sum, e) => sum + e.amount_ml, 0);
  const pending_count = entries.filter(
    (e) => e.sync_status === "pending" || e.sync_status === "error",
  ).length;

  return { total_ml, entries, pending_count };
}

/**
 * Delete water entry (tombstone for sync).
 * Actual server delete happens during background sync.
 */
export async function deleteWaterLocal(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const record = await db.waterLogs.get(id);
  if (!record) return;

  if (record.sync_status === "synced") {
    // Already on server — tombstone (mark for delete during sync)
    await tombstoneWaterLog(id);
  } else {
    // Still local only — just delete from Dexie
    await db.waterLogs.delete(id);
  }
}

/**
 * Subscribe to today's water changes (Dexie liveQuery).
 * Returns unsubscribe function.
 *
 * @example
 *   const unsub = subscribeToWaterToday(userId, (data) => {
 *     setTotalMl(data.total_ml);
 *   });
 *   return unsub; // cleanup
 */
export function subscribeToWaterToday(
  userId: string,
  cb: (data: { total_ml: number; entries: OfflineWaterLog[]; pending_count: number }) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  // Dynamic import dexie liveQuery (avoids SSR issues with observables)
  void import("dexie").then(({ liveQuery }) => {
    const observable = liveQuery(async () => {
      const entries = await db.waterLogs
        .where("[user_id+logged_at]")
        .between([userId, dayStart.getTime()], [userId, dayEnd.getTime()])
        .filter((r) => r.sync_error !== "deleted")
        .reverse()
        .sortBy("logged_at");
      return {
        total_ml: entries.reduce((s, e) => s + e.amount_ml, 0),
        entries,
        pending_count: entries.filter(
          (e) => e.sync_status === "pending" || e.sync_status === "error",
        ).length,
      };
    });
    const sub = observable.subscribe({
      next: cb,
      error: (err: unknown) => console.error("water liveQuery error:", err),
    });
    // Store subscription for cleanup
    cleanupRegistry.set(userId, sub);
  });

  return () => {
    const sub = cleanupRegistry.get(userId);
    if (sub) {
      sub.unsubscribe();
      cleanupRegistry.delete(userId);
    }
  };
}

// Module-level cleanup registry (avoid memory leaks from orphaned subscriptions)
const cleanupRegistry = new Map<string, { unsubscribe: () => void }>();
