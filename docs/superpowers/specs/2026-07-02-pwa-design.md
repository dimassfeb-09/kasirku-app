# PWA Support for Kasirku

**Date:** 2026-07-02
**Status:** Approved

## Goal
Make Kasirku a fully installable Progressive Web App with offline data access and
offline mutation queuing for POS operations.

## Requirements
1. Installable on home screen (Android, iOS, Desktop)
2. Full offline access to cached master data (products, categories, customers, orders)
3. Offline mutation queue — transactions created offline are replayed when online
4. Background Sync for automatic queue processing
5. Offline fallback page when navigation fails

## Non-Goals
- Push notifications (future)
- Offline analytics or reports (require real-time aggregation)

## Architecture

### Component Diagram
```
Browser
├── PWA Register (client component)
│   ├── Registers sw.js
│   ├── beforeinstallprompt handler → "Install" banner
│   └── Online/offline indicator badge
├── Service Worker (public/sw.js)
│   ├── Workbox CDN for caching
│   ├── Precache: /_next/static/** (build assets)
│   ├── Runtime: network-first for API GETs, cache-first for assets
│   ├── Navigation fallback: /offline.html
│   └── Background Sync: "kasirku-sync-queue" tag
└── IndexedDB (client-side via idb)
    ├── "cache" store — key-value by URL path
    ├── "queue" store — pending mutations
    └── "meta" store — sync timestamps
```

### Data Flow

| Scenario | Behavior |
|----------|----------|
| Online, normal | SW caches responses transparently, mutations pass through |
| Offline, GET | SW serves from IndexedDB cache if available |
| Offline, mutation | Client detects offline → queue in IndexedDB → toast notification |
| Reconnect | SW fires Background Sync → replay queue FIFO → remove on success |

## Files

### Create
1. **`public/manifest.json`** — Web App Manifest (icons, theme, standalone display)
2. **`public/sw.js`** — Service worker (Workbox CDN importScripts, caching strategies, bg sync)
3. **`public/offline.html`** — Static offline fallback page (minimal, no JS)
4. **`public/icons/icon-192.png`** — 192×192 app icon
5. **`public/icons/icon-512.png`** — 512×512 app icon
6. **`public/icons/icon-512-maskable.png`** — Maskable 512×512 icon
7. **`src/lib/pwa-register.tsx`** — Client component: SW register, install prompt, online status
8. **`src/lib/offline-db.ts`** — IndexedDB wrapper using `idb` (cache + queue + meta stores)
9. **`src/lib/offline-queue.ts`** — Mutation queue manager (add, process, retry logic)
10. **`src/app/offline/page.tsx`** — React offline page (more interactive than static fallback)

### Modify
11. **`src/app/layout.tsx`** — Add `manifest` to metadata, add `<PWARegister />`
12. **`next.config.ts`** — Add headers for `sw.js` (no-cache)
13. **`package.json`** — Add `idb` dependency

## Service Worker Strategy (public/sw.js)

```js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

// API GET — network first, cache fallback, 3s timeout
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.method === 'GET',
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })],
  })
);

// Static assets — cache first
workbox.routing.registerRoute(
  ({ request }) => ['style', 'script', 'font'].includes(request.destination),
  new workbox.strategies.CacheFirst({ cacheName: 'static-assets' })
);

// Navigation — network first, fallback to offline page
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages',
    fallback: '/offline.html',
  })
);

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'kasirku-sync-queue') {
    event.waitUntil(processQueue());
  }
});
```

## Offline DB (src/lib/offline-db.ts)

Uses `idb` library. Single DB `kasirku-offline` v1 with 3 object stores.

```ts
interface CachedResponse { data: unknown; cachedAt: number }
interface PendingMutation {
  id: string; url: string; method: string; body?: unknown;
  createdAt: number; retryCount: number;
}

// Methods
getCache(key: string): Promise<CachedResponse | undefined>
setCache(key: string, data: unknown, ttlMs?: number): Promise<void>
clearCache(): Promise<void>
addMutation(mutation): Promise<void>
getPendingMutations(): Promise<PendingMutation[]>
removeMutation(id: string): Promise<void>
processQueue(): Promise<void>
```

## Mutation Queue (src/lib/offline-queue.ts)

### Flow
1. App wraps fetch for mutations
2. If online → normal fetch
3. If offline → `addMutation()` → toast
4. Register Background Sync via `registration.sync.register('kasirku-sync-queue')`
5. Sync fires → `processQueue()` — replay FIFO

### Retry Policy
- 400/404 → skip (delete from queue)
- Network error / 5xx → retry up to 3× with backoff
- After 3 failures → keep in queue, notify user

## PWA Register Component (src/lib/pwa-register.tsx)

Client component:
1. Registers `sw.js` on mount
2. Listens for `beforeinstallprompt` → show install banner
3. Monitors online/offline → provides context
4. Provides `PWAContext` with `{ isOnline, canInstall, installApp }`

### Context
```ts
interface PWAContext {
  isOnline: boolean;
  canInstall: boolean;
  installApp: () => void;
}
```

## Layout Changes

```ts
export const metadata: Metadata = {
  ...existing,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Kasirku", statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
};

// Add <PWARegister /> in body
```

## Next.js Config

```ts
const nextConfig: NextConfig = {
  headers: async () => [{
    source: "/sw.js",
    headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
  }],
};
```

## Implementation Order

1. Create `public/manifest.json` and app icons
2. Add `idb` dependency + create `src/lib/offline-db.ts`
3. Create `public/sw.js` with Workbox caching strategies
4. Create `src/lib/pwa-register.tsx` for SW registration
5. Modify `src/app/layout.tsx` → add manifest metadata + PWARegister
6. Update `next.config.ts` → add headers
7. Create `public/offline.html` fallback
8. Create `src/lib/offline-queue.ts` for mutation queuing
9. Wire queue into mutation requests
10. Test: Build, verify install prompt, test offline behavior
