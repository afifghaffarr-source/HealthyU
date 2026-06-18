/**
 * AUDIT-019 — PII redaction toggle (per-user).
 *
 * Mirrors the `setAuditOptIn` pattern (src/features/scan/lib/scanGamification2.functions.ts).
 * The toggle is a per-user boolean on `public.profiles.pii_redact_enabled`
 * (added by migration `20260618012154_audit_019_pii_redact_toggle.sql`).
 *
 * Design:
 *  - Default is OFF (opt-in). Privacy is opt-in for advanced features
 *    per the project's /privacy policy.
 *  - Read fn fails closed: if the profile can't be fetched (RLS blip,
 *    missing row), we return `false` so the chat stream keeps working
 *    with the original behavior. Never the other way round — a user
 *    who turned redaction on must not silently lose that protection
 *    because of a transient read error.
 *  - Write fn throws on RLS error so the UI can surface the failure.
 *
 * Usage from the chat stream (`src/routes/api/chat/chat.stream.ts`):
 *   const enabled = await getPiiRedactEnabled(supabase, userId);
 *   const textForAi = enabled ? redactPII(body.message) : body.message;
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppSupabase = SupabaseClient<Database>;

/**
 * Read the user's `pii_redact_enabled` flag.
 *
 * Returns `false` on any failure (missing row, RLS error, etc.) — the
 * chat stream treats this as "no redaction" so a transient DB blip
 * never breaks the chat.
 */
export async function getPiiRedactEnabled(supabase: AppSupabase, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("pii_redact_enabled")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.pii_redact_enabled === true;
}

/**
 * Toggle the user's `pii_redact_enabled` flag.
 * Throws if the update fails (caller surfaces to UI).
 */
export async function setPiiRedactEnabled(
  supabase: AppSupabase,
  userId: string,
  enabled: boolean,
): Promise<{ ok: true }> {
  const { error } = await supabase
    .from("profiles")
    .update({ pii_redact_enabled: enabled })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Server-fn wrappers (called from /profile/privacy via useServerFn) ───

export const getPiiRedactEnabledFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return await getPiiRedactEnabled(supabase, userId);
  });

export const setPiiRedactEnabledFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return await setPiiRedactEnabled(supabase, userId, data.enabled);
  });
