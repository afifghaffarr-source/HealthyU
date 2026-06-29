// Simple IndexedDB queue for offline-first logging.
// Items dequeue when navigator.onLine and the sync function succeeds.
// Items auto-expire after TTL_MS to prevent stale health data lingering in IndexedDB.

export const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type QueueKind = "water" | "weight" | "meal" | "mood" | "vitals" | "workout";
export type QueueItem = {
  id?: number;
  kind: QueueKind;
  payload: unknown;
  created_at: number;
  expires_at: number;
  attempts?: number;
  next_attempt_at?: number;
  last_error?: string;
  failed_at?: number;
};

const DB_NAME = "healthyu-offline";
const LEGACY_DB_NAME = "sehatify-offline";
const STORE = "queue";
const DEAD_STORE = "dead";
const DB_VERSION = 3;

function deleteLegacyDb(): void {
  try {
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch {
    // best-effort; ignore errors
  }
}

let legacyCleanupDone = false;

const MAX_DB_RETRIES = 3;
const DB_RETRY_BASE_MS = 100;

function openDb(): Promise<IDBDatabase> {
  if (!legacyCleanupDone) {
    legacyCleanupDone = true;
    deleteLegacyDb();
  }
  return _openDbWithRetry(MAX_DB_RETRIES);
}

function _openDbWithRetry(retries: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(DEAD_STORE)) {
        db.createObjectStore(DEAD_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      if (retries > 0) {
        // Transient failure — retry with backoff
        const delay = DB_RETRY_BASE_MS * 2 ** (MAX_DB_RETRIES - retries);
        setTimeout(() => _openDbWithRetry(retries - 1).then(resolve, reject), delay);
      } else {
        reject(req.error);
      }
    };
  });
}

async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const s = t.objectStore(storeName);
    // Attach onerror BEFORE fn(s) to avoid race where transaction
    // errors during fn() execution and onerror isn't registered yet.
    t.onerror = () => reject(t.error);
    Promise.resolve(fn(s)).then(resolve, reject);
  });
}

export async function enqueue(kind: QueueKind, payload: unknown): Promise<void> {
  await cleanupExpired();
  await tx(STORE, "readwrite", (s) => {
    s.add({
      kind,
      payload,
      created_at: Date.now(),
      expires_at: Date.now() + TTL_MS,
      attempts: 0,
      next_attempt_at: 0,
    } satisfies QueueItem);
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function listAll(): Promise<QueueItem[]> {
  return tx(
    STORE,
    "readonly",
    (s) =>
      new Promise<QueueItem[]>((resolve, reject) => {
        const req = s.getAll();
        req.onsuccess = () => resolve((req.result ?? []) as QueueItem[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function remove(id: number): Promise<void> {
  await tx(STORE, "readwrite", (s) => {
    s.delete(id);
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function count(): Promise<number> {
  return tx(
    STORE,
    "readonly",
    (s) =>
      new Promise<number>((resolve, reject) => {
        const req = s.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

async function update(item: QueueItem): Promise<void> {
  await tx(STORE, "readwrite", (s) => {
    s.put(item);
  });
}

// ---- Dead-letter store ----

async function deadAdd(item: QueueItem): Promise<void> {
  const { id: _omit, ...rest } = item;
  void _omit;
  await tx(DEAD_STORE, "readwrite", (s) => {
    s.add({ ...rest, failed_at: Date.now() });
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function listDead(): Promise<QueueItem[]> {
  return tx(
    DEAD_STORE,
    "readonly",
    (s) =>
      new Promise<QueueItem[]>((resolve, reject) => {
        const req = s.getAll();
        req.onsuccess = () => resolve((req.result ?? []) as QueueItem[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function removeDead(id: number): Promise<void> {
  await tx(DEAD_STORE, "readwrite", (s) => {
    s.delete(id);
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

export async function retryDead(id: number): Promise<void> {
  const items = await listDead();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  await enqueue(item.kind, item.payload);
  await removeDead(id);
}

export async function clearDead(): Promise<void> {
  await tx(DEAD_STORE, "readwrite", (s) => {
    s.clear();
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

/** Wrap IndexedDB cursor iteration in a Promise so the caller waits for completion. */
function cursorForEach(s: IDBObjectStore, fn: (cursor: IDBCursorWithValue) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve();
      try {
        fn(cursor);
        cursor.continue();
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Remove expired items from both queue and dead-letter stores. */
export async function cleanupExpired(): Promise<void> {
  const now = Date.now();
  // Clean main queue
  await tx(STORE, "readwrite", (s) =>
    cursorForEach(s, (cursor) => {
      const item = cursor.value as QueueItem;
      if (item.expires_at && item.expires_at < now) {
        cursor.delete();
      }
    }),
  );
  // Clean dead-letter store
  await tx(DEAD_STORE, "readwrite", (s) =>
    cursorForEach(s, (cursor) => {
      const item = cursor.value as QueueItem;
      if (item.expires_at && item.expires_at < now) {
        cursor.delete();
      }
    }),
  );
}

/** Clear all queue data — call on user logout to purge health data from IndexedDB. */
export async function clearAll(): Promise<void> {
  await tx(STORE, "readwrite", (s) => {
    s.clear();
  });
  await tx(DEAD_STORE, "readwrite", (s) => {
    s.clear();
  });
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
}

type Syncer = (item: QueueItem) => Promise<void>;

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 2_000;

/** Drains the queue with exponential backoff per item. */
let _flushing = false;

export async function flush(
  syncers: Record<QueueKind, Syncer>,
): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  // Sprint 45: mutex — prevent concurrent flush() from periodic + manual sync
  if (_flushing) return { synced: 0, failed: 0 };
  _flushing = true;
  try {
    return await _flushImpl(syncers);
  } finally {
    _flushing = false;
  }
}

async function _flushImpl(
  syncers: Record<QueueKind, Syncer>,
): Promise<{ synced: number; failed: number }> {
  await cleanupExpired();
  const items = await listAll();
  const now = Date.now();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if (item.expires_at && item.expires_at < now) continue;
    if ((item.next_attempt_at ?? 0) > now) continue;

    // Sprint 45: guard against stale/unknown queue kinds
    const syncer = syncers[item.kind];
    if (!syncer) {
      console.warn(`[offline-queue] No syncer for kind=${item.kind}, removing item`);
      if (item.id != null) await remove(item.id);
      continue;
    }

    try {
      await syncer(item);
      if (item.id != null) await remove(item.id);
      synced++;
    } catch (err) {
      failed++;
      const attempts = (item.attempts ?? 0) + 1;
      const last_error = err instanceof Error ? err.message : String(err);
      if (attempts >= MAX_ATTEMPTS && item.id != null) {
        await deadAdd({ ...item, attempts, last_error });
        await remove(item.id);
      } else {
        // 2s, 4s, 8s, 16s, 32s, 64s
        const delay = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), 60_000);
        await update({ ...item, attempts, next_attempt_at: Date.now() + delay, last_error });
      }
    }
  }
  window.dispatchEvent(new CustomEvent("offline-queue:changed"));
  return { synced, failed };
}
