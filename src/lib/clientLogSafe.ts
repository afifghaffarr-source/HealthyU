/**
 * Sprint 40 — client-side structured console.error wrapper.
 *
 * Why this file exists:
 *   Bare console.error/warn calls in .tsx files can unintentionally
 *   leak identifiers or PII into the browser console. This wrapper
 *   provides a structured [scope] prefix + optional meta, making
 *   console output scannable without ever sending data to the server.
 *
 * Ponytail: 0 new infra, 0 new tables, 0 new deps, 0 new cron.
 *   Thin wrapper around console.error — browser/SSR console only.
 *
 * Distinction from logSafe.ts:
 *   logSafe.ts wraps server-side pino logging (logger.server.ts)
 *   and CANNOT be imported from .tsx files because of the TanStack
 *   import-protection plugin's *.server.* guard. clientLogSafe.ts
 *   is a pure console.error wrapper — safe to import anywhere.
 *
 * Exemption rationale (kept bare console in these files):
 *   - feature-error-boundary.tsx, route-boundaries.tsx:
 *     Framework error boundaries — fire before user data exists.
 *     Same rationale as start.ts / log-error.ts S38 exemption.
 *   - sw-update-toast.tsx:
 *     Service worker lifecycle — no PII surface, boot/bootstrap
 *     scenario where structured logging adds no value.
 */

export function clientSafeError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const meta = extra ? ` ${JSON.stringify(extra)}` : "";
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}]${meta}`, msg);
}
