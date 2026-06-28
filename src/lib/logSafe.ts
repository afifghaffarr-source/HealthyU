/**
 * Sprint 38 — safe-server-log helpers for `.functions.ts` files.
 *
 * Why this file exists:
 *   TanStack's import-protection plugin blocks static imports of any
 *   file matching `*.server.*` from client bundles (Sprint 37 learning).
 *   Files like `pdpRights.functions.ts` are co-imported by client routes
 *   (backup.tsx, audit-log-section.tsx, use-delete-account.ts) via the
 *   TanStack RPC bridge, so they CANNOT `import` logger.server.ts at
 *   module top level.
 *
 * Helper strategy:
 *   Use a `Promise<typeof logger.server>` cache and an `await import()`
 *   so each helper call hits the dynamic resolution path. The first
 *   call warms the cache; subsequent calls are O(1).
 *
 * Trade-off:
 *   These helpers are async — you must call them inside an async
 *   function and `await` (or fire-and-forget). For fire-and-forget,
 *   skip the await and rely on the unhandled-promise warning in dev.
 *
 * Per memory:
 *   engineering telemetry (counts, retry counts, trigger failure) = OK
 *   to ship without sign-off; clinical responses (when to escalate)
 *   remain DEFERRED. So this ONLY wraps logger.server — clinical
 *   response policies are NOT encoded here.
 */

let loggerCache: Promise<{
  logServerError: typeof import("./logger.server").logServerError;
  logServerWarn: typeof import("./logger.server").logServerWarn;
}> | null = null;

async function loadLogger() {
  if (!loggerCache) {
    loggerCache = import("./logger.server");
  }
  return loggerCache;
}

/**
 * PII-redacted server error log. Safe to call from any
 * `.functions.ts` file, even one that is transitively bundled in the
 * client.
 */
export async function safeLogServerError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const { logServerError } = await loadLogger();
    logServerError(scope, error, meta);
  } catch {
    // Last-resort fallback — should never fire, but if the dynamic
    // import itself errors, surface the call site to the console.

    console.error(`[${scope}]`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * PII-redacted server warning log. Same client-bundle safety as
 * `safeLogServerError`.
 */
export async function safeLogServerWarn(
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const { logServerWarn } = await loadLogger();
    logServerWarn(scope, message, meta);
  } catch {
    console.warn(`[${scope}] ${message}`);
  }
}
