importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") && url.method === "GET",
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })],
  })
);

registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 86400 * 7 })],
  })
);

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 })],
  })
);

self.addEventListener("sync", (event) => {
  if (event.tag === "kasirku-sync-queue") {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = self.indexedDB.open("kasirku-offline", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue");
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    for (const mutation of all) {
      try {
        const res = await fetch(mutation.url, {
          method: mutation.method,
          headers: { "Content-Type": "application/json" },
          body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        });

        const txw = db.transaction("queue", "readwrite");
        const storew = txw.objectStore("queue");
        if (res.ok || res.status === 400 || res.status === 404) {
          storew.delete(mutation.id);
        } else if (mutation.retryCount >= 2) {
          storew.delete(mutation.id);
        }
        await new Promise((r) => { txw.oncomplete = r; });
      } catch {
        // Network error, will retry on next sync
      }
    }
    db.close();
  } catch {
    // Queue processing failed, will retry on next sync
  }
}
