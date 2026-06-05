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

async function resetIdb() {
  // Clear both stores without deleting the DB (deleteDatabase blocks on open connections).
  const open = indexedDB.open("sehatify-offline", 2);
  await new Promise<void>((resolve, reject) => {
    open.onsuccess = () => resolve();
    open.onerror = () => reject(open.error);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("dead")) {
        db.createObjectStore("dead", { keyPath: "id", autoIncrement: true });
      }
    };
  });
  const db = open.result;
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(["queue", "dead"], "readwrite");
    t.objectStore("queue").clear();
    t.objectStore("dead").clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
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
    const syncers = {
      vitals: vi.fn().mockRejectedValue(new Error("perma-fail")),
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>;
    // Stub Date.now to advance well past any backoff between flushes.
    let now = Date.now();
    const realNow = Date.now;
    const spy = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      for (let i = 0; i < 6; i++) {
        await flush(syncers);
        now += 120_000; // skip past backoff window
      }
    } finally {
      spy.mockRestore();
      void realNow;
    }
    expect(await count()).toBe(0);
    expect((await listDead()).length).toBeGreaterThan(0);
  });

  it("retryDead re-enqueues and clearDead empties", async () => {
    await enqueue("workout", { name: "run" });
    const syncers = {
      workout: vi.fn().mockRejectedValue(new Error("x")),
    } as unknown as Record<QueueKind, (i: QueueItem) => Promise<void>>;
    let now = Date.now();
    const spy = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      for (let i = 0; i < 6; i++) {
        await flush(syncers);
        now += 120_000;
      }
    } finally {
      spy.mockRestore();
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