import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput } from "@/lib/validation";
import { USER_DATA_TABLES } from "@/lib/userDataTables";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * UU PDP (Pelindungan Data Pribadi) — user rights.
 * - exportMyData: returns JSON of all rows belonging to the user (Right to Portability).
 *   Audit-logs every call as `pdp.export` so privacy team can answer "who exported what when".
 * - requestAccountDeletion: queues an account-deletion request (Right to Erasure).
 */
type AppSupabase = SupabaseClient<Database>;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Pure function — fetches every row owned by `userId` from USER_DATA_TABLES.
 * Extracted from `exportMyData` so it can be unit-tested without invoking
 * the auth middleware chain.
 *
 * Behavior on table errors:
 * - optional + error  → table value is `[]` (skip the error)
 * - required + error  → table value is `{ error: "unavailable" }` (NEVER throw —
 *                        one broken table must not block the whole export)
 *
 * Raw error details are logged server-side via a guarded dynamic
 * import of `@/lib/logger.server` (Sprint 37). The dynamic import
 * keeps `pdpRights.functions.ts` off the client bundle — this file is
 * co-imported by client routes (backup.tsx, audit-log-section.tsx,
 * use-delete-account.ts) and the TanStack import-protection plugin
 * blocks static `*.server.*` imports for transitive client chunks.
 */
export async function buildExportDump(
  supabase: AppSupabase,
  userId: string,
): Promise<Record<string, JsonValue>> {
  const dump: Record<string, JsonValue> = {
    exported_at: new Date().toISOString(),
    user_id: userId,
  };
  for (const { table, ownerColumn, optional } of USER_DATA_TABLES) {
    // Dynamic table name — Supabase's `.from()` is typed against the union
    // of literal table names, which can't be satisfied at runtime here.
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .eq(ownerColumn, userId);
    if (!error) {
      dump[table] = (data ?? []) as JsonValue;
    } else if (optional) {
      dump[table] = [];
    } else {
      // Sprint 37 — dynamic import keeps logger.server out of the
      // client bundle. sanitizeLogMeta redacts row hints / RLS meta.
      import("@/lib/logger.server")
        .then(({ logServerError }) => logServerError("pdp.export", error, { table }))
        .catch((loggerErr) => {
          // Last-resort: strip per-message redundantly if the dynamic
          // import fails (should never happen in production).
          console.error(`[pdp.export] ${table}`, error?.message ?? error, loggerErr);
        });
      dump[table] = { error: "unavailable" };
    }
  }
  return dump;
}

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dump = await buildExportDump(supabase, userId);
    await supabase.rpc("log_audit_event", {
      _action: "pdp.export",
      _entity: "user",
      _entity_id: userId,
    });
    return dump;
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    parseInput(z.object({ reason: z.string().max(500).optional() }), i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("request_account_deletion", {
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("account_deletion_requests")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: "account.deletion_cancelled",
      _entity: "account_deletion_requests",
    });
    return { ok: true };
  });

export const getDeletionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { request: data };
  });

/**
 * Return the most-recent N entries from audit_log for the current user.
 * RLS on audit_log is row-scoped to auth.uid(), so this only ever returns
 * rows owned by the caller. Pure read — never throws on empty result.
 *
 * Used by /profile/privacy → AuditLogSection so the user can see what
 * the platform has recorded about them (UU PDP transparency).
 */
export const getMyRecentAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    parseInput(z.object({ limit: z.number().int().min(1).max(50).default(10) }), i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, entity, entity_id, meta, ip_address, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { events: rows ?? [] };
  });
