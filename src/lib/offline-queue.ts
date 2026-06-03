// Simple IndexedDB queue for offline-first logging.
// Items dequeue when navigator.onLine and the sync function succeeds.

type QueueKind = "water" | "weight" | "meal" | "mood" | "vitals" | "workout";
type QueueItem = {
  id?: number;
  kind: QueueKind;
  payload: unknown;
  created_at: number;
  attempts?: number;
  next_attempt_at?: number;
};

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
    s.add({ kind, payload, created_at: Date.now(), attempts: 0, next_attempt_at: 0 } satisfies QueueItem);
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

async function update(item: QueueItem): Promise<void> {
  await tx("readwrite", (s) => {
    s.put(item);
  });
}

type Syncer = (item: QueueItem) => Promise<void>;

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 2_000;

/** Drains the queue with exponential backoff per item. */
export async function flush(syncers: Record<QueueKind, Syncer>): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const items = await listAll();
  const now = Date.now();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if ((item.next_attempt_at ?? 0) > now) continue;
    try {
      await syncers[item.kind](item);
      if (item.id != null) await remove(item.id);
      synced++;
    } catch {
      failed++;
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS && item.id != null) {
        await remove(item.id);
      } else {
        // 2s, 4s, 8s, 16s, 32s, 64s
        const delay = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), 60_000);
        await update({ ...item, attempts, next_attempt_at: Date.now() + delay });
      }
    }
  }
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
  return { synced, failed };
}