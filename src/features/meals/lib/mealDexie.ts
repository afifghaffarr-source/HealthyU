/**
 * Meal tracker offline-first API (Dexie + sync).
 *
 * Sprint 23 — Offline Diary Mode. Mirrors waterDexie.ts (the existing
 * offline-first pattern for water logs) for meal entries.
 *
 * Flow:
 *   1. UI calls addMeal() → writes to IndexedDB instantly
 *   2. UI calls saveMutServer() → tries to push to Supabase
 *      - Success: updates Dexie row → sync_status: "synced"
 *      - Failure (offline / 5xx): leaves Dexie row → sync_status: "pending"
 *      - syncMealLogs() picks it up on next reconnect
 *
 * Why this design?
 *   - User sees instant feedback (no network round-trip)
 *   - Works on airplane mode / spotty 3G / Ramadhan iftar at remote mosque
 *   - Pola Gagal Diet detection sees complete meal data even with gaps in sync
 *
 * Why a custom helper (vs reusing waterDexie.ts pattern):
 *   - Meal payload is different (items[] array, not scalar amount_ml)
 *   - Sync needs to invoke logMealWithItems (different server fn from water)
 *   - Avoid monkey-patching the existing water path with meal-specific code
 */

import { getDb, uuid, type OfflineMealLog, type SerializedMealLogItem } from "@/lib/dexie";

// Re-export SerializedMealLogItem for callers that only depend on
// mealDexie. The canonical home is @/lib/dexie (where the table lives);
// this re-export avoids forcing every caller to also import from the
// schema file.
export type { SerializedMealLogItem };

export interface AddMealInput {
  user_id: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  /** Items in logMealWithItems shape (after warungSave.mapAdjustedToLogItems). */
  items: SerializedMealLogItem[];
  /** Free-text notes (e.g. "Scan Warung: 3 item (650 kkal)"). */
  notes?: string | null;
  /** Optional combo classification from portion-templates. */
  combo?: { id: string; name: string } | null;
  /** Optional: when user actually ate (default = now). */
  logged_at?: number;
}

export interface AddMealResult {
  id: string;
  /** True if written + considered for sync (NOT whether server push succeeded). */
  synced: boolean;
}

/**
 * Compute aggregate totals from items. Mirrors logMealWithItems server
 * logic so offline-then-sync numbers match what the server will compute
 * on its own when we replay the request.
 */
export function computeMealTotals(items: SerializedMealLogItem[]): {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
} {
  return items.reduce(
    (acc, it) => ({
      total_calories: acc.total_calories + it.calories * it.serving_qty,
      total_protein_g: acc.total_protein_g + it.protein_g * it.serving_qty,
      total_carbs_g: acc.total_carbs_g + it.carbs_g * it.serving_qty,
      total_fat_g: acc.total_fat_g + it.fat_g * it.serving_qty,
    }),
    { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0 },
  );
}

/**
 * Add meal log entry — offline-first.
 * Writes to Dexie immediately, returns. Sync runs separately via
 * syncMealLogs() in dexie-sync.ts when the network is reachable.
 */
export async function addMeal(input: AddMealInput): Promise<AddMealResult> {
  const db = getDb();
  if (!db) throw new Error("IndexedDB unavailable (SSR?)");

  const id = uuid();
  const now = Date.now();
  const totals = computeMealTotals(input.items);
  const record: OfflineMealLog = {
    id,
    user_id: input.user_id,
    meal_type: input.meal_type,
    notes: input.notes ?? null,
    total_calories: Math.round(totals.total_calories),
    total_protein_g: round1(totals.total_protein_g),
    total_carbs_g: round1(totals.total_carbs_g),
    total_fat_g: round1(totals.total_fat_g),
    items: input.items,
    logged_at: input.logged_at ?? now,
    created_at: now,
    updated_at: now,
    synced_at: null,
    sync_status: "pending",
    sync_error: null,
    combo_id: input.combo?.id ?? null,
    combo_name: input.combo?.name ?? null,
  };

  await db.mealLogs.add(record);
  // NB: sync trigger lives in dexie-sync.ts orchestrator (not here) so
  //     water + meal share one timer window.

  return { id, synced: false };
}

/**
 * Read today's meals from IndexedDB — includes both synced and pending.
 * Use this when offline or as an immediate hydration source.
 */
export async function todaysMealsLocal(userId: string): Promise<{
  entries: OfflineMealLog[];
  pending_count: number;
  total_calories: number;
}> {
  const db = getDb();
  if (!db) return { entries: [], pending_count: 0, total_calories: 0 };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const entries = await db.mealLogs
    .where("[user_id+logged_at]")
    .between([userId, dayStart.getTime()], [userId, dayEnd.getTime()])
    .toArray();

  // Sort newest-first for UI consistency with server response
  entries.sort((a, b) => b.logged_at - a.logged_at);

  return {
    entries,
    pending_count: entries.filter((e) => e.sync_status !== "synced").length,
    total_calories: entries.reduce((sum, e) => sum + e.total_calories, 0),
  };
}

/**
 * Count of pending (unsynced) meal records across all days. Used by the
 * OfflineStatusBand ("3 entry menunggu sinkronisasi").
 */
export async function pendingMealSyncCount(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  return db.mealLogs
    .where("sync_status")
    .anyOf(["pending", "error"] as OfflineMealLog["sync_status"][])
    .count();
}

function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}
