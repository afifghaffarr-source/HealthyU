// Custom CF Workers entry for TanStack Start.
//
// Why this file exists:
// - The default @tanstack/react-start/server-entry exposes a fetch handler
//   that does NOT forward `env` (CF Workers bindings) into the request
//   middleware context. As a result, route handlers, server functions, and
//   loaders cannot read secrets via `getEnv()`.
// - We wrap the default entry and re-export a fetch that translates the
//   2nd arg (`env`) into a `requestOpts.context` object. TanStack's
//   `createStartHandler` reads `requestOpts?.context` and passes it to all
//   request middlewares (including envInjectionMiddleware in start.ts).
// - This file is referenced as `main` in wrangler.jsonc. The
//   @cloudflare/vite-plugin bundles it into dist/server/ at build time.
//
// Cache strategy (2026-06-20, Sprint 5d):
// - HTML navigations: Cache-Control: no-store (force Worker re-run; CF edge
//   must never serve stale SSR after a deploy)
// - Vite assets under /assets/*: 1 year immutable (content-hashed filenames,
//   safe to cache forever — the hash changes when content changes)
// - Fonts under /fonts/*: 1 year immutable (woff2 files, content-stable)
// - Recipe images under /images/recipes/*: 30 days (user-generated uploads
//   may be replaced; we serve new URLs via the recipes.image_url column)
// - PWA manifest + icons: 1 day (metadata may change in deploys)
// - Everything else: passthrough (no Cache-Control override)

import defaultEntry from "@tanstack/react-start/server-entry";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const inner = defaultEntry as unknown as ServerEntry;

type CacheRule = {
  match: (pathname: string, contentType: string) => boolean;
  header: string;
};

// Order matters — first match wins. Keep the most-specific rules first.
const CACHE_RULES: readonly CacheRule[] = [
  // Vite hashed bundles — safe to cache forever (filename = content hash)
  {
    match: (p) => p.startsWith("/assets/"),
    header: "public, max-age=31536000, immutable",
  },
  // Fonts — content-stable binary files
  {
    match: (p) => p.startsWith("/fonts/"),
    header: "public, max-age=31536000, immutable",
  },
  // Recipe images — uploaded by users; URL changes when replaced
  {
    match: (p) => p.startsWith("/images/"),
    header: "public, max-age=2592000, s-maxage=2592000",
  },
  // PWA icons + manifest — metadata may change in deploys
  {
    match: (p, ct) =>
      ct.includes("application/manifest") ||
      p === "/manifest.json" ||
      p === "/manifest.webmanifest" ||
      /\.(svg|png|ico|webp)$/i.test(p),
    header: "public, max-age=86400",
  },
];

/** Apply cache policy to a response. Pure function — extracted for testability. */
export function applyCachePolicy(response: Response, pathname: string): Response {
  const contentType = response.headers.get("content-type") ?? "";

  // HTML: force no-store so CF edge never serves stale SSR after a deploy.
  // Symptom (pre-5d): production HTML referenced stale `index-*.js` bundle
  // hashes for hours after a deploy, breaking client hydration.
  if (contentType.includes("text/html")) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Static assets: apply immutable / long cache based on URL pattern.
  for (const rule of CACHE_RULES) {
    if (rule.match(pathname, contentType)) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", rule.header);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Pass env as requestOpts.context so TanStack's requestMiddleware chain
    // (including envInjectionMiddleware in start.ts) can read it.
    // Signature: entry.fetch(request, requestOpts, ctx).
    const response = await inner.fetch(request, { context: env } as unknown as Request, ctx);
    const pathname = new URL(request.url).pathname;
    return applyCachePolicy(response, pathname);
  },
};
