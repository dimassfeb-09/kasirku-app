# PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kasirku fully installable PWA with offline data cache and mutation queue.

**Architecture:** Static `manifest.json` + Workbox CDN in `sw.js` for caching + IndexedDB via `idb` library for offline data store and mutation queue. PWA register component handles SW registration and install prompt.

**Tech Stack:** Workbox CDN 7.3, `idb` npm package, Next.js 16.2.9

---

### Task 1: App Icons + Manifest

**Files:**
- Create: `public/icons/receipt.svg`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-512-maskable.png`
- Create: `public/manifest.json`

- [ ] **Step 1: Create receipt SVG icon**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#18181b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
  <path d="M8 7h8"/>
  <path d="M8 11h8"/>
  <path d="M8 15h5"/>
</svg>
```

- [ ] **Step 2: Generate PNG icons**

Run a one-time script to generate PNGs from SVG. Create and run:

```bash
bun add -d sharp
```

Create `scripts/generate-icons.ts`:

```typescript
import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icons/receipt.svg");

async function main() {
  await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
  // maskable version with padding
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: await sharp(svg).resize(384, 384).toBuffer(), left: 64, top: 64 }])
    .png()
    .toFile("public/icons/icon-512-maskable.png");
  console.log("Icons generated");
}

main();
```

Run: `bun run scripts/generate-icons.ts`

- [ ] **Step 3: Create manifest.json**

```json
{
  "name": "Kasirku - Point of Sale",
  "short_name": "Kasirku",
  "description": "Modern POS application untuk bisnis retail dan F&B",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#18181b",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add public/icons/ public/manifest.json scripts/generate-icons.ts
git commit -m "feat: add PWA manifest and app icons"
```

---

### Task 2: IndexedDB Wrapper (offline-db.ts)

**Files:**
- Modify: `package.json` (add `idb`)
- Create: `src/lib/offline-db.ts`

- [ ] **Step 1: Install idb**

```bash
bun add idb
```

- [ ] **Step 2: Create offline-db.ts**

```typescript
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

export async function addMutation(mutation: Omit<PendingMutation, "id" | "createdAt" | "retryCount">): Promise<void> {
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/offline-db.ts package.json bun.lock
git commit -m "feat: add IndexedDB wrapper for offline cache and mutation queue"
```

---

### Task 3: Service Worker (sw.js)

**Files:**
- Create: `public/sw.js`

- [ ] **Step 1: Create sw.js**

```javascript
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

// API GET — network first with 3s timeout, fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") && url.method === "GET",
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
    ],
  })
);

// Static assets — cache first
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 86400 * 7 }),
    ],
  })
);

// Navigation — network first, fallback to offline page
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 }),
    ],
  })
);

// Background Sync — process mutation queue
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
    }) as IDBDatabase;

    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue");
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }) as Array<{ id: string; url: string; method: string; body?: unknown; retryCount: number }>;

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
          storew.delete(mutation.id); // skip after 3 failures
        }
        await new Promise((r) => { txw.oncomplete = r; });
      } catch {
        // Network error — skip, will retry on next sync
      }
    }
    db.close();
  } catch {
    // Queue processing failed — will retry on next sync
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker with Workbox caching and background sync"
```

---

### Task 4: PWA Register Component

**Files:**
- Create: `src/lib/pwa-register.tsx`

- [ ] **Step 1: Create pwa-register.tsx**

```typescript
"use client";

import * as React from "react";

interface PWAContextValue {
  isOnline: boolean;
  canInstall: boolean;
  installApp: () => void;
}

const PWAContext = React.createContext<PWAContextValue>({
  isOnline: true,
  canInstall: false,
  installApp: () => {},
});

export function usePWA() {
  return React.useContext(PWAContext);
}

export function PWARegister({ children }: { children?: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [canInstall, setCanInstall] = React.useState(false);
  const deferredPrompt = React.useRef<Event | null>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  const installApp = React.useCallback(async () => {
    const prompt = deferredPrompt.current as unknown as
      | { prompt: () => Promise<void>; outcome?: string }
      | null;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.outcome;
    if (result === "accepted") {
      setCanInstall(false);
    }
    deferredPrompt.current = null;
  }, []);

  return (
    <PWAContext.Provider value={{ isOnline, canInstall, installApp }}>
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 shadow-lg">
          Tidak ada koneksi internet
        </div>
      )}
      {canInstall && (
        <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <span className="text-sm">Install Kasirku</span>
          <button
            onClick={installApp}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Install
          </button>
          <button
            onClick={() => setCanInstall(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Tutup
          </button>
        </div>
      )}
      {children}
    </PWAContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pwa-register.tsx
git commit -m "feat: add PWA register component with install prompt and online indicator"
```

---

### Task 5: Wire PWA into Layout + Config

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Update layout.tsx**

Add manifest link and apple web app meta to metadata, and add `<PWARegister>` wrapper.

```typescript
// In src/app/layout.tsx

export const metadata: Metadata = {
  title: "Kasirku - Point of Sale",
  description: "Modern web-based POS application for retail and F&B businesses",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kasirku",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// Wrap children with PWARegister:
import { PWARegister } from "@/lib/pwa-register";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <TooltipProvider>
            <PWARegister>
              {children}
            </PWARegister>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx next.config.ts
git commit -m "feat: wire PWA manifest and service worker into app layout"
```

---

### Task 6: Offline Fallback Page

**Files:**
- Create: `public/offline.html`

- [ ] **Step 1: Create offline.html**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kasirku - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #fafafa; color: #18181b;
    }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    svg { width: 64px; height: 64px; stroke: #18181b; margin-bottom: 1.5rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: #71717a; margin-bottom: 1.5rem; line-height: 1.5; }
    button {
      background: #18181b; color: #fafafa; border: none;
      padding: 0.75rem 1.5rem; border-radius: 0.5rem;
      font-size: 0.875rem; cursor: pointer;
    }
    button:hover { background: #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>
    </svg>
    <h1>Tidak ada koneksi internet</h1>
    <p>Beberapa fitur mungkin tidak tersedia. Periksa koneksi Anda dan coba lagi.</p>
    <button onclick="window.location.reload()">Coba Lagi</button>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/offline.html
git commit -m "feat: add offline fallback page for service worker navigation"
```

---

### Task 7: Mutation Queue Manager

**Files:**
- Create: `src/lib/offline-queue.ts`

- [ ] **Step 1: Create offline-queue.ts**

```typescript
import { addMutation, getPendingMutations, removeMutation, updateMutationRetry, setMeta, getMeta } from "./offline-db";

export async function queueMutation(url: string, method: string, body?: unknown): Promise<void> {
  await addMutation({ url, method, body });

  if ("serviceWorker" in navigator && "sync" in navigator.serviceWorker) {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      try {
        await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("kasirku-sync-queue");
      } catch {
        // Background Sync not supported — will process on next online event
      }
    }
  }

  // Fallback: register online handler if sync not available
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/offline-queue.ts
git commit -m "feat: add offline mutation queue manager with background sync"
```

---

### Task 8: Wire Queue into API Mutations

**Files:**
- Create: `src/lib/api-client.ts`

- [ ] **Step 1: Create api-client.ts**

A thin wrapper around `fetch` that intercepts mutations when offline.

```typescript
import { toast } from "sonner";
import { queueMutation } from "./offline-queue";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isMutation && typeof navigator !== "undefined" && !navigator.onLine) {
    await queueMutation(url, method, body);
    toast.success("Data disimpan secara offline dan akan dikirim saat koneksi tersedia");
    return {} as T;
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat: add API client with offline mutation queue fallback"
```

---

### Task 9: Build Verification + Lighthouse Test

- [ ] **Step 1: Run production build**

```bash
bun run build
```
Expected: Successful build with no errors.

- [ ] **Step 2: Start production server and verify service worker**

```bash
bun run start
```
Then open `http://localhost:3000` in Chrome. Open DevTools → Application → Service Workers. Verify `sw.js` is registered and activated.

- [ ] **Step 3: Verify manifest**

In Chrome DevTools → Application → Manifest. Verify name, icons, display mode.

- [ ] **Step 4: Verify offline behavior**

DevTools → Network → check "Offline". Navigate to `/dashboard`. Should show offline.html fallback (or cached page if previously visited).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete PWA implementation with offline support"
```
