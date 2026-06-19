/**
 * IndexedDB wrapper pakai Dexie untuk offline-first user data.
 *
 * Architecture (offline-first pattern):
 *   1. UI write ke Dexie dulu (instant feedback)
 *   2. Background sync ke Supabase (best-effort, retry on reconnect)
 *   3. Conflict resolution: last-write-wins per record (UUID v4 = unique ID)
 *
 * Schema design (rekomendasi gw untuk user — auto-generated PK):
 *   - Primary key: UUID v4 (auto-generated oleh Dexie atau crypto.randomUUID())
 *   - Indexes: [user_id+logged_at] untuk query harian, [sync_status] untuk sync queue
 *   - Sync metadata: synced_at (null = pending), updated_at, deleted (tombstone)
 *
 * Kenapa UUID bukan auto-increment?
 *   - Sync-safe: tiap device bisa generate ID tanpa collision
 *   - Privacy: tidak bocorin count of records
 *   - Portable: kalau migrate ke Postgres UUID, no rewrite needed
 *
 * Browser support: semua modern (IndexedDB API standard sejak 2014).
 * Storage quota: ~50% free disk (Chrome) atau ~10% (Firefox). Untuk user
 * dengan ratusan scan/air/water entries per bulan, gak akan kehabisan.
 */

import Dexie, { type Table } from "dexie";

export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export interface BaseOfflineRecord {
  /** UUID v4 — auto-generated. Primary key untuk sync safety. */
  id: string;
  /** Supabase user_id (untuk RLS saat sync ke server). */
  user_id: string;
  /** Client-side timestamp saat data dibuat (immutable). */
  created_at: number;
  /** Client-side timestamp saat data di-update terakhir. */
  updated_at: number;
  /** ISO timestamp saat berhasil sync ke Supabase (null = pending). */
  synced_at: number | null;
  /** Sync state untuk background sync orchestrator. */
  sync_status: SyncStatus;
  /** Error message kalau sync_status = "error". */
  sync_error: string | null;
}

// ===== Water Logs =====

export interface OfflineWaterLog extends BaseOfflineRecord {
  amount_ml: number;
  /** Sumber input: manual / quick-add / reminder / imported. */
  source: "manual" | "quick-add" | "reminder" | "imported";
  /** Catatan opsional dari user. */
  note: string | null;
  /** logged_at = kapan user actually minum (mungkin di-backdate). */
  logged_at: number;
}

class HealthyUDatabase extends Dexie {
  waterLogs!: Table<OfflineWaterLog, string>;

  constructor() {
    super("HealthyUDB");
    // v1: initial schema. Tambah version baru kalau ada perubahan schema.
    this.version(1).stores({
      // Compound index [user_id+logged_at] untuk query harian yang cepet
      // sync_status index untuk sync queue processing
      waterLogs: "id, user_id, [user_id+logged_at], sync_status, created_at, logged_at",
    });
  }
}

// Lazy-init biar gak instantiate di SSR (IndexedDB cuma available di browser)
let dbInstance: HealthyUDatabase | null = null;

/**
 * Get Dexie database instance. Returns null on SSR (caller harus handle).
 *
 * @example
 *   const db = getDb();
 *   if (!db) return; // SSR, skip
 *   await db.waterLogs.add({ ... });
 */
export function getDb(): HealthyUDatabase | null {
  if (typeof window === "undefined") return null;
  if (!dbInstance) dbInstance = new HealthyUDatabase();
  return dbInstance;
}

/**
 * Generate UUID v4 (crypto.randomUUID atau fallback).
 * Dipakai untuk record.id — sync-safe across devices.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback untuk browser lama / non-secure context
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
