/**
 * Custom Service Worker source for vite-plugin-pwa (injectManifest strategy).
 *
 * Why custom?
 * - `workbox-build` has an ESM/CJS interop bug with bun 1.2.21 + brace-expansion@2.x:
 *   '(0, brace_expansion_1.expand) is not a function'. workbox-build uses
 *   `import { expand } from 'brace-expansion'` but brace-expansion is CJS-only.
 *   This blocks workbox-build's generateSW entirely (no sw.js emitted).
 *
 * - `injectManifest` strategy inlines the user-provided SW source into a
 *   precache manifest we generate ourselves via `import { glob }` from Vite
 *   build-time esbuild. Workbox's `InjectManifest` class handles precache
 *   at runtime in the browser, so we sidestep the build-time glob issue.
 *
 * What this SW does:
 * 1. Install: precache all assets in self.__WB_MANIFEST (injected by Vite).
 * 2. Activate: cleanup outdated caches, claim clients (skipWaiting happens
 *    from the client useRegisterSW hook via messageSkipWaiting()).
 * 3. Fetch:
 *    - /api/* /auth/* /cdn-cgi/* → NetworkOnly (never cache mutations)
 *    - Google Fonts stylesheets → StaleWhileRevalidate
 *    - Google Fonts webfonts → CacheFirst
 *    - supabase.co/storage/* images → CacheFirst
 *    - Other GET requests → try cache, then network, fallback to /index.html
 *      (navigateFallback for SPA deep links offline)
 */

/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkOnly, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  // Precache manifest placeholder.
  // Workaround for workbox-build ESM bug under bun 1.2.21 — we cannot use
  // workbox-build.injectManifest() to inject __WB_MANIFEST at build time.
  // For now: empty precache, runtime caching only (Google Fonts, Supabase images).
  // App shell is small enough that first-load (with cache headers from CF) is
  // acceptable for offline; offline navigation still works via NavigationRoute
  // to /index.html (cached by browser HTTP cache).
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Sprint 5a: cache key prefix changes per deploy so Workbox activates a fresh
// cache state on every bump. The activate handler below purges any cache
// whose name does NOT start with the current version prefix. This forces a
// clean slate for users hitting stale SW from previous deploys — without
// requiring manual SW unregister.
//
// `__SW_CACHE_VERSION__` is replaced at build time by vite.config.ts `define`
// (plain identifier substitution). We use it as a top-level literal so the
// replacement produces a valid string literal in the output bundle.
// @ts-expect-error -- injected at build time by vite define
const CURRENT_VERSION: string = __SW_CACHE_VERSION__;

// Claim clients immediately on activate (paired with skipWaiting from registerSW).
clientsClaim();

// Precache the app shell — when injectionPoint=true, Vite plugin inlines the
// build-time manifest. With injectionPoint=false (workbox-build ESM bug), this
// is an empty array. Runtime caches (fonts, supabase images) still work fine.
precacheAndRoute(self.__WB_MANIFEST || []);

// Sprint 5a: on activate, purge all caches that don't match the current version
// prefix. This invalidates stale SW state from previous deploys (which held
// old server fn IDs, old chunk hashes, etc.) without requiring users to
// manually unregister the SW.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(`${CURRENT_VERSION}-`))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// SPA navigation fallback: deep links → /index.html so React Router handles them.
// Only for GET navigation requests (excludes mutations).
// Sprint 5a fix: also denylist /_serverFn/* (TanStack Start RPC endpoint) —
// these must NEVER be served from cache because server function IDs are
// regenerated on every deploy. A stale cached response for /_serverFn/{id}
// would 404 because the {id} doesn't exist on the current worker bundle.
// Also denylist /assets/* (Vite content-hash chunks) — same issue: stale chunk
// references stale server fn IDs, leading to "Server function info not found".
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    /^\/api\/.*/,
    /^\/auth\/.*/,
    /^\/cdn-cgi\/.*/,
    /^\/_serverFn\/.*/, // Sprint 5a: TanStack Start RPC must always hit network
    /^\/assets\/.*/, // Sprint 5a: Vite content-hash chunks must always hit network
  ],
});
registerRoute(navigationRoute);

// Sprint 5a fix: explicit NetworkOnly for TanStack Start RPC endpoint.
// Belt-and-suspenders alongside the NavigationRoute denylist above.
// Without this, a previous-deploy chunk could reference a server fn ID that
// no longer exists on the current worker, producing errors like:
//   "Server function info not found for {hash}"
registerRoute(({ url }) => url.pathname.startsWith("/_serverFn/"), new NetworkOnly());

// Runtime caching: Google Fonts stylesheets (CSS).
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// Runtime caching: Google Fonts webfonts (font files).
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// Runtime caching: Supabase Storage images.
registerRoute(
  ({ url }) =>
    url.origin === "https://ohkfcldkuzfcxnpqvdvc.supabase.co" &&
    url.pathname.startsWith("/storage/"),
  new CacheFirst({
    cacheName: "supabase-storage-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

// Mutations + auth endpoints: NEVER cache. Always hit network.
registerRoute(
  ({ url, request }) =>
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/cdn-cgi/"),
  new NetworkOnly(),
);

// Skip waiting on message from client (triggered by useRegisterSW updateServiceWorker).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

export {};
