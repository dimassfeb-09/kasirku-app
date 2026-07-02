import { openDB, type IDBPDatabase } from "idb";

interface CachedResponse {
  data: unknown;
  cachedAt: number;
}

interface PendingMutation {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  createdAt: number;
  retryCount: number;
}

interface OfflineDB {
  cache: CachedResponse;
  queue: PendingMutation;
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>("kasirku-offline", 1, {
      upgrade(db) {
        db.createObjectStore("cache");
        const queue = db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        queue.createIndex("createdAt", "createdAt");
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function getCache(key: string): Promise<CachedResponse | undefined> {
  const db = await getDB();
  return db.get("cache", key);
}

export async function setCache(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put("cache", { data, cachedAt: Date.now() }, key);
}

export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear("cache");
}

export async function addMutation(
  mutation: Omit<PendingMutation, "id" | "createdAt" | "retryCount">
): Promise<void> {
  const db = await getDB();
  await db.add("queue", { ...mutation, createdAt: Date.now(), retryCount: 0 });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDB();
  return db.getAll("queue");
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("queue", id);
}

export async function updateMutationRetry(id: string, retryCount: number): Promise<void> {
  const db = await getDB();
  const mutation = await db.get("queue", id);
  if (mutation) {
    mutation.retryCount = retryCount;
    await db.put("queue", mutation);
  }
}

export async function getMeta(key: string): Promise<unknown> {
  const db = await getDB();
  const entry = await db.get("meta", key);
  return entry?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}
