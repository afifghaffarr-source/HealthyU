// Environment variable validation with Zod.
//
// This module is the single source of truth for env access. Importing
// it triggers a one-time validation pass that throws a clear error
// listing every missing or malformed variable — much better than the
// "Cannot read property of undefined" you'd get from a missing var
// at runtime.
//
// Three tiers:
//   - `clientEnv` — VITE_* vars shipped in the browser bundle
//   - `serverEnv` — process.env vars available in server functions
//   - `serverEnvOptional` — lazy getters for optional vars
//                    (read at call time, not boot)
//
// Why not just `import.meta.env.X`? Two reasons:
//   1. Type safety: Zod narrows the union (string | undefined) to
//      `string`, so downstream code never needs `?? "fallback"`.
//   2. Fail-fast: misconfigured deploys (e.g. CF Pages missing a var)
//      blow up at boot, not on the first user request.

import { z } from "zod";
import { getEnv } from "./cloudflare-env.server";

// ──────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────

const trimmedNonEmpty = z
  .string()
  .min(1, "must not be empty")
  .transform((s) => s.trim());

const url = trimmedNonEmpty.refine(
  (s) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  },
  { message: "must be a valid URL" },
);

const supabaseKey = trimmedNonEmpty.refine(
  (s) => s.startsWith("eyJ") || s.startsWith("sb_publishable_") || s.startsWith("sbp_"),
  {
    message: "must be a Supabase publishable key (starts with eyJ / sb_publishable_ / sbp_)",
  },
);

const vexoKey = trimmedNonEmpty.refine((s) => s.startsWith("VEXO_") || s.length >= 32, {
  message: "must be a VexoAPI key (starts with VEXO_ or ≥32 chars)",
});

const cronSecret = z
  .string()
  .min(32, "CRON_SECRET must be at least 32 chars; generate with: openssl rand -hex 32");

export const clientSchema = z.object({
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
  VITE_SUPABASE_PROJECT_ID: trimmedNonEmpty,
});

export const serverSchema = z.object({
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: supabaseKey,
  SUPABASE_SERVICE_ROLE_KEY: trimmedNonEmpty,
  VEXO_API_KEY: vexoKey,
  VEXO_BASE_URL: url.default("https://vexoapi.dev"),
  CRON_SECRET: cronSecret,
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

// ──────────────────────────────────────────────────────────────────────
// Validators (exposed for testing)
// ──────────────────────────────────────────────────────────────────────

export function validateClientEnv(
  raw: Partial<Record<keyof ClientEnv, string | undefined>>,
): { ok: true; data: ClientEnv } | { ok: false; error: z.ZodError } {
  const result = clientSchema.safeParse(raw);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export function validateServerEnv(
  raw: Partial<Record<keyof ServerEnv, string | undefined>>,
): { ok: true; data: ServerEnv } | { ok: false; error: z.ZodError } {
  const result = serverSchema.safeParse(raw);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

function formatIssues(err: z.ZodError): string {
  return err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Module-level validation (fail-fast on misconfigured deploys)
// ──────────────────────────────────────────────────────────────────────

// Client — always validate (works in both client and server).
const _clientResult = validateClientEnv({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
});
if (!_clientResult.ok) {
  throw new Error(
    `[env] Invalid client environment variables:\n${formatIssues(_clientResult.error)}\n` +
      `Check your .env (local) or Cloudflare Pages → Settings → Environment variables (deploy).`,
  );
}
export const clientEnv = _clientResult.data;

// Server — lazy validation. We don't validate at module load because in CF
// Workers the env bindings aren't available until request time (they're passed
// via the `env` parameter to the fetch handler, then propagated through
// AsyncLocalStorage by `server.ts`). Instead, `serverEnv` is a Proxy that
// validates on first access. This preserves the "fail-fast on misconfigured
// deploys" guarantee — the first read in a handler throws a clear error.
//
// In jsdom test envs the server validation is skipped (window is defined);
// unit tests call `validateServerEnv` directly to test the schema.
let _serverData: ServerEnv | undefined;
let _serverValidated = false;

function getValidatedServerEnv(): ServerEnv {
  if (_serverValidated && _serverData) return _serverData;
  _serverValidated = true;

  // Read from CF env first (AsyncLocalStorage), then process.env fallback.
  // This is the single entry point — never use process.env directly in
  // server code (it doesn't see CF secrets in production).
  const env = getEnv();

  const _serverResult = validateServerEnv({
    SUPABASE_URL: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    VEXO_API_KEY: env.VEXO_API_KEY,
    VEXO_BASE_URL: env.VEXO_BASE_URL,
    CRON_SECRET: env.CRON_SECRET,
  });
  if (!_serverResult.ok) {
    throw new Error(
      `[env] Invalid server environment variables:\n${formatIssues(_serverResult.error)}\n` +
        `Set these in Cloudflare Workers → Settings → Variables/Secrets, ` +
        `or in .env (local dev — never commit).`,
    );
  }
  _serverData = _serverResult.data;
  return _serverData;
}

// Lazy Proxy: first access triggers validation, subsequent reads return cached.
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    const data = getValidatedServerEnv();
    return data[prop as keyof ServerEnv];
  },
});

// ──────────────────────────────────────────────────────────────────────
// Optional server env (read at call time, not boot)
// ──────────────────────────────────────────────────────────────────────

export const serverEnvOptional = {
  get VAPID_SUBJECT(): string {
    return getEnv().VAPID_SUBJECT || "mailto:support@healthyu.id";
  },
  get VAPID_PRIVATE_KEY(): string | undefined {
    const v = getEnv().VAPID_PRIVATE_KEY;
    return typeof v === "string" ? v : undefined;
  },
  get GOOGLE_FIT_CLIENT_ID(): string | undefined {
    const v = getEnv().GOOGLE_FIT_CLIENT_ID;
    return typeof v === "string" ? v : undefined;
  },
  get GOOGLE_FIT_CLIENT_SECRET(): string | undefined {
    const v = getEnv().GOOGLE_FIT_CLIENT_SECRET;
    return typeof v === "string" ? v : undefined;
  },
} as const;
