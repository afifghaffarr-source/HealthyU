// Centralized env access for Cloudflare Workers runtime.
//
// Why this file exists:
// - CF Workers `secrets` bindings are passed via the `env` parameter to the fetch
//   handler, NOT via process.env. So `process.env.SUPABASE_URL` returns undefined
//   at runtime in production, which broke /sitemap.xml with 500s.
// - We use AsyncLocalStorage (Node's `node:async_hooks`, available via
//   `nodejs_compat` flag in wrangler.jsonc) to propagate the env object through
//   TanStack Start handlers without changing call sites.
// - In local dev (vite) and unit tests, AsyncLocalStorage is empty → we fall back
//   to process.env. This preserves the existing "set in .env" workflow.
//
// Usage:
//   import { getEnv, withEnv } from "@/lib/cloudflare-env.server";
//   const env = getEnv();
//   const url = env.SUPABASE_URL;
//
//   // Or get a single var with fallback chain:
//   import { getEnvVar } from "@/lib/cloudflare-env.server";
//   const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Shape of the Cloudflare env object (vars + secrets + future bindings).
 * All keys are optional because some environments may not have all vars
 * (e.g. tests only mock the ones they care about).
 */
export interface CloudflareEnv {
  // Server secrets (encrypted in CF dashboard)
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VEXO_API_KEY?: string;
  VEXO_BASE_URL?: string;
  // OpenRouter — free tier vision models (gemini-2.0-flash-exp, llama-3.2-vision, qwen-2-vl)
  // Used when image-bearing prompts need a model that supports images.
  // VexoAPI free tier is text-only (verified 2026-06-19); OpenRouter free tier
  // has 50 req/day shared limit, or 1000/day with $10 top-up.
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL?: string;
  CRON_SECRET?: string;
  VAPID_SUBJECT?: string;
  VAPID_PRIVATE_KEY?: string;
  GOOGLE_FIT_CLIENT_ID?: string;
  GOOGLE_FIT_CLIENT_SECRET?: string;
  // Resend email API (replaced MailChannels, which is discontinued on CF Workers free tier)
  RESEND_API_KEY?: string;
  // Client-side vars (VITE_*) — also available in browser bundle
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_VEXO_API_KEY?: string;
  VITE_APP_URL?: string;
  VITE_SITE_URL?: string;
  // Allow extra bindings (KV, D1, R2, Durable Objects, etc.) without TS errors
  [key: string]: unknown;
}

const envStorage = new AsyncLocalStorage<CloudflareEnv>();

/**
 * Wrap a function call (typically the entire request handler) with a CF env
 * context. Anything that calls `getEnv()` inside will receive this env object.
 *
 * The wrapper is type-safe: it expects a `CloudflareEnv` and returns whatever
 * the wrapped function returns.
 */
export function withEnv<T>(env: CloudflareEnv, fn: () => T): T {
  return envStorage.run(env, fn);
}

/**
 * Async version of withEnv. Required when the wrapped function returns a
 * Promise that needs to preserve the AsyncLocalStorage context across
 * `await` boundaries. CF Workers' AsyncLocalStorage implementation
 * (node:async_hooks via nodejs_compat) requires the callback to either
 * be sync or returned as a Promise from within the run() call.
 */
export async function withEnvAsync<T>(env: CloudflareEnv, fn: () => Promise<T> | T): Promise<T> {
  let resolve!: (v: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  envStorage.run(env, () => {
    Promise.resolve(fn()).then(resolve, reject);
  });
  return promise;
}

/**
 * Read the current env object. Prefers the CF Workers env (from AsyncLocalStorage)
 * and merges in process.env as a fallback so local dev + tests still work.
 *
 * Lookup order per key:
 *   1. AsyncLocalStorage (CF Workers runtime) — set by server.ts wrapper
 *   2. process.env (local dev, tests, build-time) — set via .env or vi.stubEnv
 *
 * Returns a merged object. Values from AsyncLocalStorage take precedence.
 *
 * The CF env is normalized first (see normalizeCfEnv) to defend against
 * wrangler --var edge cases that store keys as the literal "KEY=VALUE"
 * string instead of { KEY: "VALUE" }.
 */
export function getEnv(): CloudflareEnv {
  const stored = envStorage.getStore();
  const fromProcess = readProcessEnv();
  if (stored) {
    return { ...fromProcess, ...normalizeCfEnv(stored) };
  }
  return fromProcess;
}

/**
 * Get a single env var by name. Returns undefined if neither the CF env nor
 * process.env has it. Convenience wrapper around `getEnv()`.
 */
export function getEnvVar(name: string): string | undefined {
  const env = getEnv();
  const value = env[name];
  if (value === undefined || value === null) return undefined;
  return String(value);
}

/**
 * Test helper: run a function with a mocked CF env. Use in tests instead of
 * mocking process.env directly. Mirrors `withEnv` but doesn't pollute the
 * AsyncLocalStorage stack in a way that leaks across tests.
 */
export function withMockedEnv<T>(env: Partial<CloudflareEnv>, fn: () => T): T {
  return envStorage.run({ ...readProcessEnv(), ...env } as CloudflareEnv, fn);
}

// ──────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Normalize a CF Workers env object to handle wrangler --var edge cases.
 *
 * Background: wrangler 4.100.0 with `--var "KEY=VALUE"` does NOT parse
 * the "=" — it stores the literal string "KEY=VALUE" as a key (with a
 * truthy placeholder value). Result: env has keys like
 *   { "GIT_SHA=abc123": true, "GIT_SHA=def456": true, ... }
 * instead of { "GIT_SHA": "abc123" }. This accumulates across deploys
 * (one weird key per deploy) because each new --var adds a new entry
 * with a different SHA, instead of overwriting the previous value.
 *
 * Workaround at the reader side:
 *   1. Keep clean keys (no '=') as-is.
 *   2. For weird keys ('KEY=VALUE...'), strip the '=value' suffix to get
 *      the real key name. Only set if no clean key with that name exists
 *      (clean wins). For multiple weird keys for the same name, keep the
 *      first occurrence (preserves wrangler's iteration order).
 *
 * The deploy workflow should ALSO be fixed to use the canonical wrangler
 * syntax `--var "KEY:VALUE"` (colon, not equals) so future deploys do not
 * accumulate. This helper is defense in depth for the existing accumulation
 * (18+ orphan keys observed in production as of 2026-06-17) AND for any
 * future regression where someone re-introduces the '=' syntax.
 *
 * Exported for testability. Not part of the public API.
 */
export function normalizeCfEnv(env: CloudflareEnv | undefined | null): CloudflareEnv {
  if (!env) return {};
  // First pass: copy clean keys (no '=') as-is.
  const result: CloudflareEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.includes("=")) {
      result[key] = value;
    }
  }
  // Second pass: add weird keys (with '='), but only if the clean
  // version is absent. First occurrence wins (JS Object iteration
  // preserves insertion order for string keys).
  for (const [rawKey, value] of Object.entries(env)) {
    if (rawKey.includes("=")) {
      const key = rawKey.split("=")[0];
      if (!(key in result)) {
        result[key] = value;
      }
    }
  }
  return result;
}

function readProcessEnv(): CloudflareEnv {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as unknown as CloudflareEnv;
}
