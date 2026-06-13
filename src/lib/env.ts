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

// Server — only validate when running server-side (no `window`).
// In jsdom test envs the server validation is skipped; unit tests
// can call `validateServerEnv` directly to test the schema.
let _serverData: ServerEnv | undefined;
if (typeof window === "undefined") {
  if (typeof process === "undefined" || !process.env) {
    throw new Error("[env] Server runtime without process.env — cannot validate.");
  }
  const _serverResult = validateServerEnv({
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VEXO_API_KEY: process.env.VEXO_API_KEY,
    VEXO_BASE_URL: process.env.VEXO_BASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  });
  if (!_serverResult.ok) {
    throw new Error(
      `[env] Invalid server environment variables:\n${formatIssues(_serverResult.error)}\n` +
        `Set these in Cloudflare Pages → Settings → Environment variables, ` +
        `or in .env (local dev — never commit).`,
    );
  }
  _serverData = _serverResult.data;
}
export const serverEnv = _serverData as ServerEnv;

// ──────────────────────────────────────────────────────────────────────
// Optional server env (read at call time, not boot)
// ──────────────────────────────────────────────────────────────────────

export const serverEnvOptional = {
  get VAPID_SUBJECT(): string {
    return process.env?.VAPID_SUBJECT || "mailto:support@healthyu.id";
  },
  get VAPID_PRIVATE_KEY(): string | undefined {
    return process.env?.VAPID_PRIVATE_KEY;
  },
  get GOOGLE_FIT_CLIENT_ID(): string | undefined {
    return process.env?.GOOGLE_FIT_CLIENT_ID;
  },
  get GOOGLE_FIT_CLIENT_SECRET(): string | undefined {
    return process.env?.GOOGLE_FIT_CLIENT_SECRET;
  },
} as const;
