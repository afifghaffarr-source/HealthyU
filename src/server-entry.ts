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

import defaultEntry from "@tanstack/react-start/server-entry";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const inner = defaultEntry as unknown as ServerEntry;

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Pass env as requestOpts.context so TanStack's requestMiddleware chain
    // (including envInjectionMiddleware in start.ts) can read it.
    // Signature: entry.fetch(request, requestOpts, ctx).
    const response = await inner.fetch(request, { context: env } as unknown as Request, ctx);
    // For HTML navigations, force CF edge to never cache the response.
    // Without this, CF CDN caches SSR HTML by URL and keeps serving the old
    // version after a deploy (worker code is updated but edge cache is not).
    // Symptom: production HTML references stale `index-*.js` bundle hashes
    // for hours after a deploy, breaking client hydration. Fix: add
    // Cache-Control: no-store so every request re-runs the Worker.
    // We only touch HTML responses; static assets keep their own cache
    // headers (vite assets are content-hashed and immutable).
    const contentType = response.headers.get("content-type") ?? "";
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
    return response;
  },
};
