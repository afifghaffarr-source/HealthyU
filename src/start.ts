import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { withEnvAsync, type CloudflareEnv } from "@/lib/cloudflare-env.server";

/**
 * Inject CF Workers env bindings into AsyncLocalStorage so `getEnv()` works
 * inside route handlers, server functions, and loaders.
 *
 * Why: CF Workers pass vars+secrets as the 2nd arg (`env`) to the fetch
 * handler. TanStack Start exposes this through the request middleware's
 * `context` (typed via `createStart({ requestContext })`). We capture it
 * here once per request so downstream code can read secrets via `getEnv()`
 * without prop-drilling.
 */
const envInjectionMiddleware = createMiddleware().server(async ({ context, next }) => {
  // Unwrap if needed: if context is {context: env}, use ctx.context.
  // This handles the custom server-entry.ts wrapper (passes env as requestOpts.context)
  // AND the default TanStack entry (passes env directly as context).
  const ctx = context as Record<string, unknown> | undefined;
  const ctxHasNestedContext =
    !!ctx && "context" in ctx && typeof ctx.context === "object" && ctx.context !== null;
  const envToInject = ctxHasNestedContext
    ? (ctx.context as unknown as CloudflareEnv)
    : (context as unknown as CloudflareEnv);

  // DEBUG-INJECT-START: temporary diag to trace why CI deploys return empty env
  // Toggle via DEBUG_ENV_TRACE=1 (will be removed once CI deploy is confirmed working)
  if (
    typeof (globalThis as { DEBUG_ENV_TRACE?: unknown }).DEBUG_ENV_TRACE === "string" ||
    (envToInject && (envToInject as Record<string, unknown>).DEBUG_ENV_TRACE === "1")
  ) {
    const keys = envToInject ? Object.keys(envToInject).slice(0, 8) : [];
    const hasSupabaseUrl = !!(envToInject as Record<string, unknown> | null)?.SUPABASE_URL;
    const hasPubKey = !!(envToInject as Record<string, unknown> | null)?.SUPABASE_PUBLISHABLE_KEY;
    console.log(
      `[env-trace] ctxHasNestedContext=${ctxHasNestedContext} ctxKeys=${keys.join(",")} ` +
        `hasSupabaseUrl=${hasSupabaseUrl} hasPubKey=${hasPubKey} ` +
        `contextType=${typeof context} contextKeys=${ctx ? Object.keys(ctx).join(",") : "null"}`,
    );
  }
  // DEBUG-INJECT-END

  return withEnvAsync(envToInject, async () => {
    return await next();
  });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * CSP directives — allowlist berdasarkan origin yang benar-benar dipakai:
 * - self: semua asset lokal
 * - *.supabase.co: REST, auth, storage images, Realtime websocket
 * - cdn.jsdelivr.net + tessdata.projectnaptha.com: Tesseract.js OCR (worker/WASM/data)
 * - 'unsafe-inline' style: Tailwind/Radix/vaul/recharts inline styles
 * - 'unsafe-inline' script: TanStack Start hydration script
 * - 'wasm-unsafe-eval' + blob:: Tesseract.js WASM
 * Font tidak masuk allowlist karena sudah self-hosted (/fonts/*.woff2).
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://tessdata.projectnaptha.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net blob:",
  "wasm-unsafe-eval",
].join("; ");

/**
 * Security headers — diaplikasikan ke semua response HTML.
 * CSP default report-only, bisa di-enforce via CSP_ENFORCE=1 env.
 */
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = result.response;
  const headers = new Headers(response.headers);

  // Cegah MIME sniffing
  if (!headers.has("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  // Cegah clickjacking
  if (!headers.has("x-frame-options")) {
    headers.set("x-frame-options", "DENY");
  }
  // Minim leak URL ke third-party
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  // Paksa HTTPS 1 tahun (subdomain include). Aman karena app sudah HTTPS-only.
  if (!headers.has("strict-transport-security")) {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  // Batasi akses sensor browser yang tidak dipakai
  if (!headers.has("permissions-policy")) {
    headers.set(
      "permissions-policy",
      "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    );
  }
  // Isolasi cross-origin (aman untuk app yang tidak embed third-party widget)
  if (!headers.has("cross-origin-opener-policy")) {
    headers.set("cross-origin-opener-policy", "same-origin");
  }

  // CSP hanya untuk HTML responses (bukan API/static assets)
  const contentType = headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const cspEnforce = (globalThis as { CSP_ENFORCE?: unknown }).CSP_ENFORCE === "1";
    const cspHeaderName = cspEnforce
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";
    headers.set(cspHeaderName, CSP_DIRECTIVES + "; report-uri /api/csp-report");
  }

  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [envInjectionMiddleware, errorMiddleware, securityHeadersMiddleware],
}));
