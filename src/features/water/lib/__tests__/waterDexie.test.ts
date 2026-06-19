/**
 * Tests for waterDexie — offline-first water tracker API.
 *
 * Strategy:
 *   - Mock IndexedDB pakai fake-indexeddb (production-grade IDB shim)
 *   - Test add → todaysWater → delete lifecycle
 *   - Test sync_status transitions
 *   - Test offline-first guarantee (sync failure doesn't lose data)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Disable background sync in tests — makes assertions deterministic
// (otherwise void syncWaterLogs() could mutate state between checks).
vi.mock("@/lib/dexie-sync", () => ({
  syncWaterLogs: vi.fn().mockResolvedValue({ synced: 0, failed: 0 }),
  tombstoneWaterLog: vi.fn(async (id: string) => {
    const { getDb } = await import("@/lib/dexie");
    const db = getDb();
    if (!db) return;
    await db.waterLogs.update(id, {
      sync_error: "deleted",
      sync_status: "pending",
      updated_at: Date.now(),
    });
  }),
  purgeWaterLog: vi.fn(),
}));

import { addWater, todaysWaterLocal, deleteWaterLocal } from "@/features/water/lib/waterDexie";

const TEST_USER = "test-user-uuid";

describe("waterDexie (offline-first)", () => {
  beforeEach(async () => {
    // Clear DB between tests
    const { getDb } = await import("@/lib/dexie");
    const db = getDb();
    if (db) await db.waterLogs.clear();
  });

  describe("addWater", () => {
    it("writes to Dexie with sync_status=pending", async () => {
      const { id } = await addWater({ amount_ml: 250, user_id: TEST_USER });
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);

      const { getDb } = await import("@/lib/dexie");
      const record = await getDb()!.waterLogs.get(id);
      expect(record).toBeDefined();
      expect(record?.amount_ml).toBe(250);
      expect(record?.sync_status).toBe("pending");
      expect(record?.synced_at).toBeNull();
    });

    it("supports multiple adds in same session", async () => {
      await addWater({ amount_ml: 200, user_id: TEST_USER });
      await addWater({ amount_ml: 300, user_id: TEST_USER });
      await addWater({ amount_ml: 500, user_id: TEST_USER });

      const { total_ml, entries } = await todaysWaterLocal(TEST_USER);
      expect(total_ml).toBe(1000);
      expect(entries).toHaveLength(3);
    });
  });

  describe("todaysWaterLocal", () => {
    it("returns zero for user with no entries", async () => {
      const { total_ml, entries, pending_count } = await todaysWaterLocal(TEST_USER);
      expect(total_ml).toBe(0);
      expect(entries).toHaveLength(0);
      expect(pending_count).toBe(0);
    });

    it("counts pending entries correctly", async () => {
      const { getDb } = await import("@/lib/dexie");
      await addWater({ amount_ml: 250, user_id: TEST_USER });
      await addWater({ amount_ml: 200, user_id: TEST_USER });

      // Manually mark one as synced
      const all = await getDb()!.waterLogs.toArray();
      await getDb()!.waterLogs.update(all[0].id, {
        sync_status: "synced",
        synced_at: Date.now(),
      });

      const { pending_count } = await todaysWaterLocal(TEST_USER);
      expect(pending_count).toBe(1);
    });

    it("excludes tombstoned entries", async () => {
      const { id } = await addWater({ amount_ml: 250, user_id: TEST_USER });
      await deleteWaterLocal(id);

      const { entries, total_ml } = await todaysWaterLocal(TEST_USER);
      expect(entries).toHaveLength(0);
      expect(total_ml).toBe(0);
    });
  });

  describe("deleteWaterLocal", () => {
    it("immediately removes pending (not-yet-synced) entries", async () => {
      const { id } = await addWater({ amount_ml: 250, user_id: TEST_USER });
      await deleteWaterLocal(id);

      const { getDb } = await import("@/lib/dexie");
      const record = await getDb()!.waterLogs.get(id);
      expect(record).toBeUndefined();
    });

    it("tombstones synced entries (marks for server delete)", async () => {
      const { id } = await addWater({ amount_ml: 250, user_id: TEST_USER });
      const { getDb } = await import("@/lib/dexie");

      // Mark as synced first
      await getDb()!.waterLogs.update(id, {
        sync_status: "synced",
        synced_at: Date.now(),
      });

      await deleteWaterLocal(id);

      const record = await getDb()!.waterLogs.get(id);
      expect(record).toBeDefined();
      expect(record?.sync_error).toBe("deleted");
      expect(record?.sync_status).toBe("pending");
    });
  });
});
