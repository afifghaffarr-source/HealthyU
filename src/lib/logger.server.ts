/**
 * Server-side logger. Filters sensitive keys agar tidak membocorkan
 * token, email, auth header, AI prompt lengkap, dsb ke log production.
 *
 * Pakai ini di server function / server route, jangan console.error langsung.
 */

const BLOCKED_KEY_FRAGMENTS = [
  "token",
  "password",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "email",
  "phone",
  "session",
  "cookie",
  "p256dh",
  "auth",
  "endpoint",
];

function isBlockedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return BLOCKED_KEY_FRAGMENTS.some((b) => lower.includes(b));
}

export function sanitizeLogMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (isBlockedKey(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 200) {
      out[k] = `${v.slice(0, 200)}…(truncated ${v.length - 200})`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function formatError(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error) };
}

export function logServerError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  console.error(`[${scope}]`, {
    ...formatError(error),
    meta: sanitizeLogMeta(meta),
  });
}

export function logServerWarn(
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  console.warn(`[${scope}] ${message}`, sanitizeLogMeta(meta) ?? "");
}
