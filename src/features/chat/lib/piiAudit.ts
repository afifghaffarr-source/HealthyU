/**
 * AUDIT-017 Phase 2E — PII detection audit log.
 *
 * Two helpers that mirror the same job on both sides of the wire:
 *  - `auditPiiOnClient(text)` — client-side, called when the user
 *    explicitly confirms sending a flagged message. Writes to
 *    `error_reports` (fire-and-forget via `reportError`).
 *  - `auditPiiOnServer(supabase, userId, text)` — server-side,
 *    called from `/api/chat/stream` as defense-in-depth. Writes to
 *    the server-side `audit_log` via the `log_audit_event` RPC.
 *
 * **Never logs the actual PII value.** Only the kinds (e.g.
 * `["phone", "email"]`) and the count of findings. This is a hard
 * rule — logging the matched text would just create a new PII leak
 * surface in our audit log.
 *
 * Both helpers no-op silently on clean text. The server helper
 * catches all errors so a logging failure can never break the chat
 * stream.
 */

import { piiKinds, detectPII, type PiiKind } from "@/lib/pii";
import { reportError } from "@/lib/errorReporting";

/**
 * Client-side PII audit. Call this when the user explicitly
 * confirms sending a message that was flagged. Skips if the text
 * is clean (defensive — caller should already have checked, but
 * double-checking costs nothing).
 *
 * No PII value is sent over the wire. Only kinds + count.
 */
export function auditPiiOnClient(text: string): void {
  if (!text) return;
  const findings = detectPII(text);
  if (findings.length === 0) return;
  const kinds = piiKinds(text);

  // `reportError` is fire-and-forget; never throws. We pass a
  // synthetic Error so the standard payload shape is preserved,
  // and put the actual telemetry in `context`. Wrap in try/catch
  // defensively — a misbehaving reporter must not crash the chat.
  try {
    reportError(
      new Error("PII detected in chat message (user confirmed send)"),
      {
        mechanism: "manual",
        source: "chat.pii.detected.client",
        kinds,
        count: findings.length,
      },
      { severity: "warning", handled: true },
    );
  } catch {
    /* swallow */
  }
}

/**
 * Server-side PII audit. Call this from `/api/chat/stream` after
 * the message is parsed + auth is verified, before any AI call or
 * persistence. This is the defense-in-depth layer: even if the
 * client bypasses the warning dialog (older app version, direct
 * curl, modified client), the server still records the event.
 *
 * Errors are swallowed — an audit-log failure must never break
 * the chat stream response.
 */
export async function auditPiiOnServer(
  // Loose typing so this file stays server-safe to import (no
  // direct supabase type import here).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  text: string,
): Promise<void> {
  if (!text) return;
  const findings = detectPII(text);
  if (findings.length === 0) return;
  const kinds = piiKinds(text);

  try {
    await supabase.rpc("log_audit_event", {
      _action: "chat.pii.detected",
      _entity: "chat",
      _meta: { kinds, count: findings.length } as never,
    });
  } catch {
    // Swallow — audit logging is best-effort. A failed log here
    // must not affect the user's chat response.
  }
}

/**
 * Re-export so test code can import the kind type from one place.
 */
export type { PiiKind };
