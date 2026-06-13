/**
 * Client-side error reporter — replaces Lovable's
 * `window.__lovableEvents.captureException`.
 *
 * In dev: just console.error so we don't fill the table while iterating.
 * In prod: fires a fire-and-forget POST to /api/log-error, which writes
 * to the `error_reports` table via the service role.
 *
 * Never throws — error reporting itself must not crash the app.
 */

export type ReportErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ErrorContext = Record<string, unknown>;

declare global {
  interface Window {
    __healthyuErrorEndpoint?: string;
  }
}

function getEndpoint(): string {
  if (typeof window === "undefined") return "/api/log-error";
  return window.__healthyuErrorEndpoint ?? "/api/log-error";
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeStack(value: unknown): string | null {
  if (value instanceof Error && typeof value.stack === "string") return value.stack;
  return null;
}

export function reportError(
  error: unknown,
  context: ErrorContext = {},
  options: ReportErrorOptions = {},
): void {
  // SSR / build-time: no-op.
  if (typeof window === "undefined") return;

  const severity = options.severity ?? "error";
  const handled = options.handled ?? false;
  const mechanism = options.mechanism ?? "react_error_boundary";
  const source = (context.source as string) ?? mechanism;

  // Always log to console for local dev visibility.

  console.error(`[${source}]`, error, context);

  // Dev: don't write to DB (would flood the table during iteration).
  if (import.meta.env.DEV) return;

  const payload = {
    source,
    boundary: (context.boundary as string) ?? "global",
    message: safeStringify(error),
    stack: safeStack(error),
    context: { ...context, route: window.location.pathname },
    route: window.location.pathname,
    handled,
    severity,
    mechanism,
  };

  // Fire-and-forget. Never await; never throw.
  try {
    void fetch(getEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* swallow — we don't want reporting to crash the app */
    });
  } catch {
    /* swallow */
  }
}

/**
 * Backwards-compatible alias. Old code calls `reportLovableError(...)`.
 * Same signature, same behavior, new name internally.
 */
export const reportLovableError = reportError;
