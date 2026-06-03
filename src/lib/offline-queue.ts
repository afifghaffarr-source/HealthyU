// Simple IndexedDB queue for offline-first logging.
// Items dequeue when navigator.onLine and the sync function succeeds.

type QueueKind = "water" | "weight" | "meal";
type QueueItem = { id?: number; kind: QueueKind; payload: unknown; created_at: number };

const DB_NAME = "sehatify-offline";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    Promise.resolve(fn(s)).then(resolve, reject);
    t.onerror = () => reject(t.error);
  });
}

export async function enqueue(kind: QueueKind, payload: unknown): Promise<void> {
  await tx("readwrite", (s) => {
    s.add({ kind, payload, created_at: Date.now() } satisfies QueueItem);
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function listAll(): Promise<QueueItem[]> {
  return tx("readonly", (s) =>
    new Promise<QueueItem[]>((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve((req.result ?? []) as QueueItem[]);
      req.onerror = () => reject(req.error);
    }),
  );
}

export async function remove(id: number): Promise<void> {
  await tx("readwrite", (s) => {
    s.delete(id);
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function count(): Promise<number> {
  return tx("readonly", (s) =>
    new Promise<number>((resolve, reject) => {
      const req = s.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }),
  );
}

type Syncer = (item: QueueItem) => Promise<void>;

/** Drains the queue. Stops on first error to retry later. */
export async function flush(syncers: Record<QueueKind, Syncer>): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const items = await listAll();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await syncers[item.kind](item);
      if (item.id != null) await remove(item.id);
      synced++;
    } catch {
      failed++;
      break;
    }
  }
  return { synced, failed };
}