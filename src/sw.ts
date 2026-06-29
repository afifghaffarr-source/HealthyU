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
  // Sprint 45: populated by scripts/precache-inject.ts post-build.
  // The inject script walks dist/client/assets and generates the real manifest
  // so the SW precaches the app shell for offline use. Previously empty due to
  // workbox-build ESM/CJS bug under bun 1.2.21.
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Claim clients immediately on activate (paired with skipWaiting from registerSW).
clientsClaim();

// v2: Force skipWaiting on install to bust stale JS bundles cached by previous SW.
// Without this, users on installed PWA see old code until they manually clear cache
// or close all tabs. Hotfix for the gallery upload bug fix (capture=environment).
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Precache the app shell — when injectionPoint=true, Vite plugin inlines the
// build-time manifest. With injectionPoint=false (workbox-build ESM bug), this
// is an empty array. Runtime caches (fonts, supabase images) still work fine.
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA navigation fallback: deep links → /index.html so React Router handles them.
// Only for GET navigation requests (excludes mutations).
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/api\/.*/, /^\/auth\/.*/, /^\/cdn-cgi\/.*/],
});
registerRoute(navigationRoute);

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
