import type { Batch, CannifySettings, FoodItem, HistoryEvent } from "./types";

const DB_NAME = "cannify";
const DB_VERSION = 2;

export const STORES = {
  items: "items",
  batches: "batches",
  history: "history",
  settings: "settings",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function openCannifyDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.items)) {
          const items = db.createObjectStore(STORES.items, { keyPath: "id" });
          items.createIndex("by_status", "status");
          items.createIndex("by_name", "name");
          items.createIndex("by_category", "category");
        }
        if (!db.objectStoreNames.contains(STORES.batches)) {
          const batches = db.createObjectStore(STORES.batches, { keyPath: "id" });
          batches.createIndex("by_item", "itemId");
          batches.createIndex("by_status", "status");
        }
        if (!db.objectStoreNames.contains(STORES.history)) {
          const history = db.createObjectStore(STORES.history, { keyPath: "id" });
          history.createIndex("by_item", "itemId");
          history.createIndex("by_created", "createdAt");
          history.createIndex("by_type", "type");
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Could not open Cannify storage."));
      };
    });
  }
  return dbPromise;
}

export async function withTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openCannifyDb();
  // Always include every store. cannifyStores() reads all three, and IndexedDB
  // rejects objectStore() for a name that is not in the transaction scope.
  const names = Array.from(
    new Set([...storeNames, STORES.items, STORES.batches, STORES.history, STORES.settings]),
  );
  const tx = db.transaction(names, mode);
  const result = await work(tx);
  await transactionDone(tx);
  return result;
}

export function store(tx: IDBTransaction, name: string): IDBObjectStore {
  return tx.objectStore(name);
}

export function getById<T>(objectStore: IDBObjectStore, id: string): Promise<T | undefined> {
  return requestToPromise(objectStore.get(id)) as Promise<T | undefined>;
}

export function putRecord<T>(objectStore: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return requestToPromise(objectStore.put(value));
}

export function deleteRecord(objectStore: IDBObjectStore, id: string): Promise<void> {
  return requestToPromise(objectStore.delete(id)).then(() => undefined);
}

export function getAll<T>(objectStore: IDBObjectStore): Promise<T[]> {
  return requestToPromise(objectStore.getAll()) as Promise<T[]>;
}

export function getAllFromIndex<T>(
  objectStore: IDBObjectStore,
  indexName: string,
  query: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  return requestToPromise(objectStore.index(indexName).getAll(query)) as Promise<T[]>;
}

export type TxStores = {
  items: IDBObjectStore;
  batches: IDBObjectStore;
  history: IDBObjectStore;
  settings: IDBObjectStore;
};

export function cannifyStores(tx: IDBTransaction): TxStores {
  return {
    items: tx.objectStore(STORES.items),
    batches: tx.objectStore(STORES.batches),
    history: tx.objectStore(STORES.history),
    settings: tx.objectStore(STORES.settings),
  };
}

export async function loadAllRecords(): Promise<{
  items: FoodItem[];
  batches: Batch[];
  history: HistoryEvent[];
  settings: CannifySettings | undefined;
}> {
  return withTransaction([STORES.items, STORES.batches, STORES.history], "readonly", async (tx) => {
    const stores = cannifyStores(tx);
    const [items, batches, history, settings] = await Promise.all([
      getAll<FoodItem>(stores.items),
      getAll<Batch>(stores.batches),
      getAll<HistoryEvent>(stores.history),
      getById<CannifySettings>(stores.settings, "app"),
    ]);
    return { items, batches, history, settings };
  });
}
