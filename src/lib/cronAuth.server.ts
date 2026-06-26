/**
 * Cron / scheduled-job endpoint auth helper.
 *
 * Public `/api/public/*` routes bypass Lovable's edge auth, so cron endpoints
 * MUST validate their own shared secret. We deliberately do NOT trust the
 * Supabase publishable / anon key here — that key is meant to ship to browsers
 * and is not a secret.
 *
 * Configure `CRON_SECRET` in project secrets, then pass it from `pg_cron` as:
 *   headers := '{"x-cron-secret": "<value>"}'::jsonb
 * or
 *   headers := '{"authorization": "Bearer <value>"}'::jsonb
 *
 * Fail-closed: if `CRON_SECRET` is unset, every request is rejected with 500.
 */
import { getEnv } from "@/lib/cloudflare-env.server";

export function requireCronSecret(request: Request): Response | null {
  // CF env first (AsyncLocalStorage) → process.env fallback (local dev/tests).
  const expected = getEnv().CRON_SECRET;
  if (!expected || expected.length < 16) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured on server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "");
  const received = headerSecret || bearer;

  // Temporary debug logging
  console.log("[CRON_AUTH_DEBUG] Auth header raw:", authHeader?.substring(0, 20) + "...");
  console.log("[CRON_AUTH_DEBUG] Received length:", received?.length);
  console.log("[CRON_AUTH_DEBUG] Expected length:", expected.length);
  console.log("[CRON_AUTH_DEBUG] Received first 8:", received?.substring(0, 8));
  console.log("[CRON_AUTH_DEBUG] Expected first 8:", expected.substring(0, 8));
  console.log("[CRON_AUTH_DEBUG] Received last 8:", received?.substring(received.length - 8));
  console.log("[CRON_AUTH_DEBUG] Expected last 8:", expected.substring(expected.length - 8));

  if (!received || !timingSafeEqualStr(received, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
