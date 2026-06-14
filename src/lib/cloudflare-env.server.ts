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
  CRON_SECRET?: string;
  VAPID_SUBJECT?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  GOOGLE_FIT_CLIENT_ID?: string;
  GOOGLE_FIT_CLIENT_SECRET?: string;
  // Client-side vars (VITE_*) — also available in browser bundle
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_VEXO_API_KEY?: string;
  VITE_APP_URL?: string;
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
 * Read the current env object. Prefers the CF Workers env (from AsyncLocalStorage)
 * and merges in process.env as a fallback so local dev + tests still work.
 *
 * Lookup order per key:
 *   1. AsyncLocalStorage (CF Workers runtime) — set by server.ts wrapper
 *   2. process.env (local dev, tests, build-time) — set via .env or vi.stubEnv
 *
 * Returns a merged object. Values from AsyncLocalStorage take precedence.
 */
export function getEnv(): CloudflareEnv {
  const stored = envStorage.getStore();
  const fromProcess = readProcessEnv();
  if (stored) {
    return { ...fromProcess, ...stored };
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

function readProcessEnv(): CloudflareEnv {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as unknown as CloudflareEnv;
}
