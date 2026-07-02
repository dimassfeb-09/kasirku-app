import { addMutation, getPendingMutations, removeMutation, updateMutationRetry, setMeta } from "./offline-db";

export async function queueMutation(url: string, method: string, body?: unknown): Promise<void> {
  await addMutation({ url, method, body });

  if ("serviceWorker" in navigator && "sync" in navigator.serviceWorker) {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      try {
        await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("kasirku-sync-queue");
      } catch {
        // Background Sync not supported
      }
    }
  }

  if (!("sync" in (await navigator.serviceWorker.ready))) {
    const handler = async () => {
      await processQueueLocally();
      window.removeEventListener("online", handler);
    };
    window.addEventListener("online", handler);
  }
}

export async function processQueueLocally(): Promise<void> {
  const mutations = await getPendingMutations();
  const sorted = [...mutations].sort((a, b) => a.createdAt - b.createdAt);

  for (const mutation of sorted) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: { "Content-Type": "application/json" },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (res.ok || res.status === 400 || res.status === 404) {
        await removeMutation(mutation.id);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      const newRetry = mutation.retryCount + 1;
      if (newRetry >= 3) {
        await updateMutationRetry(mutation.id, newRetry);
      } else {
        await updateMutationRetry(mutation.id, newRetry);
      }
    }
  }

  await setMeta("lastSync", Date.now());
}
