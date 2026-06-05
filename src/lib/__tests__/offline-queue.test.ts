import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueue,
  listAll,
  listDead,
  count,
  flush,
  remove,
  retryDead,
  clearDead,
  type QueueItem,
  type QueueKind,
} from "../offline-queue";

function resetIdb() {
  // fake-indexeddb provides a reset hook via the factory; recreate by deleting the DB.
  return new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("sehatify-offline");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe("offline-queue", () => {
  beforeEach(async () => {
    await resetIdb();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("enqueue + listAll + count", async () => {
    await enqueue("water", { ml: 250 });
    await enqueue("weight", { kg: 70 });
    expect(await count()).toBe(2);
    const items = await listAll();
    expect(items.map((i) => i.kind).sort()).toEqual(["water", "weight"]);
  });

  it("remove deletes by id", async () => {
    await enqueue("mood", { score: 4 });
    const [item] = await listAll();
    await remove(item.id!);
    expect(await count()).toBe(0);
  });

  it("flush short-circuits when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await enqueue("water", { ml: 100 });
    const syncer = vi.fn();
    const result = await flush({
      water: syncer,
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>);
    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(syncer).not.toHaveBeenCalled();
  });

  it("flush removes synced items", async () => {
    await enqueue("water", { ml: 250 });
    await enqueue("water", { ml: 500 });
    const syncer = vi.fn().mockResolvedValue(undefined);
    const result = await flush({
      water: syncer,
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>);
    expect(result.synced).toBe(2);
    expect(await count()).toBe(0);
  });

  it("flush retries with backoff on failure", async () => {
    await enqueue("meal", { id: "m1" });
    const syncer = vi.fn().mockRejectedValue(new Error("net"));
    const result = await flush({
      meal: syncer,
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(await count()).toBe(1);
    const [item] = await listAll();
    expect(item.attempts).toBe(1);
    expect(item.last_error).toBe("net");
    expect(item.next_attempt_at).toBeGreaterThan(Date.now());
  });

  it("flush moves to dead-letter after MAX_ATTEMPTS", async () => {
    await enqueue("vitals", { hr: 70 });
    const syncer = vi.fn().mockRejectedValue(new Error("perma-fail"));
    const syncers = { vitals: syncer } as unknown as Record<
      QueueKind,
      (i: QueueItem) => Promise<void>
    >;
    // 6 attempts to hit MAX
    for (let i = 0; i < 6; i++) {
      // bypass next_attempt_at by clearing it
      const items = await listAll();
      if (items[0]?.id != null) {
        await remove(items[0].id);
        await enqueue("vitals", items[0].payload);
      }
      await flush(syncers);
    }
    expect(await count()).toBe(0);
    const dead = await listDead();
    expect(dead.length).toBeGreaterThan(0);
  });

  it("retryDead re-enqueues and clearDead empties", async () => {
    await enqueue("workout", { name: "run" });
    await flush({
      workout: vi.fn().mockRejectedValue(new Error("x")),
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>);
    // force into dead by simulating max attempts directly via repeated cycles
    for (let i = 0; i < 6; i++) {
      const items = await listAll();
      if (items[0]?.id != null) {
        await remove(items[0].id);
        await enqueue("workout", items[0].payload);
      }
      await flush({
        workout: vi.fn().mockRejectedValue(new Error("x")),
      } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>);
    }
    const dead = await listDead();
    expect(dead.length).toBeGreaterThan(0);
    if (dead[0]?.id != null) {
      await retryDead(dead[0].id);
      expect(await count()).toBeGreaterThan(0);
    }
    await clearDead();
    expect(await listDead()).toHaveLength(0);
  });
});